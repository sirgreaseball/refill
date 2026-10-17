-- 011: clients book an open time themselves (the waitlist is the fallback), the desk can book a
-- client who is already waiting (so it reaches their phone and account), the live clock runs on
-- the server every minute, and owners can rename or delete their business. Anyone can delete
-- their own account.

-- 1. The live clock. Every minute, every live business moves to India time; a new date closes
--    yesterday into history. Before this the clock moved only while a desk page was open.
create extension if not exists pg_cron;

create or replace function public.tick_live()
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare w record; m int := ist_minute(); d date := ist_date(); n int := 0;
begin
  for w in select id, day from workspaces where kind = 'live' loop
    if w.day is null or w.day < d then
      perform archive_day(w.id);
      update workspaces set day = d where id = w.id;
    end if;
    update workspaces set now_min = m where id = w.id and now_min is distinct from m;
    perform expire_offers(w.id, m);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.tick_live() from public, anon, authenticated;
select cron.schedule('refill-live-clock', '* * * * *', 'select public.tick_live()');

-- 2. Times a client can book today for one service: a cancelled time nobody holds an offer for,
--    or empty time in the day of someone who is in and does the service. Business facts only.
create or replace function public.open_times(p_code text, p_minutes int, p_skill text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with w as (select id, now_min, now_min + min_lead_min as earliest from workspaces
             where join_code = p_code and p_minutes between 5 and 720),
       st as (select t.* from staff t join w on t.ws = w.id where t.active and t.present and p_skill = any (t.skills)),
       opts as (
         select st.id as staff, st.name, x.start_min, x.id as slot
         from slots x join st on st.id = x.staff_id join w on x.ws = w.id
         where x.status = 'free' and x.minutes >= p_minutes
           and x.start_min >= w.earliest and x.start_min + p_minutes <= st.shift_end
           and not exists (select 1 from offers o where o.ws = w.id and o.slot_id = x.id and o.status = 'sent'
                           and (o.expires_min is null or o.expires_min > w.now_min))
         union all
         select st.id, st.name, t, null
         from st join w on true, generate_series(((st.shift_start + 14) / 15) * 15, st.shift_end - p_minutes, 15) t
         where t >= w.earliest
           and not exists (select 1 from slots x where x.ws = w.id and x.staff_id = st.id
                           and x.start_min < t + p_minutes and x.start_min + x.minutes > t))
  select jsonb_build_object('ok', exists (select 1 from w), 'now_min', (select now_min from w),
    'times', coalesce((select jsonb_agg(jsonb_build_object('staff', o.staff, 'name', o.name, 'start_min', o.start_min, 'slot', o.slot)
                                        order by o.start_min, o.name)
                       from (select * from opts order by start_min, name limit 120) o), '[]'));
$$;

-- 3. Book one of those times. The staff row is locked, so two people can never take the same
--    empty time; a cancelled slot is locked and booked as it is, which counts as recovered.
--    The client gets a private page and, when signed in, it is on their account.
create or replace function public.book_time(p_code text, p_entry jsonb, p_staff text, p_start int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; st staff; x slots; tok text := new_key(); nid text; sid text; npos int; bid bigint;
        v_min int; v_skill text := trim(coalesce(p_entry ->> 'skill', '')); v_name text := trim(coalesce(p_entry ->> 'name', ''));
        v_service text := nullif(trim(coalesce(p_entry ->> 'service', '')), ''); v_price int; v_consent boolean;
begin
  perform enforce_rate('book:' || client_ip(), 30, 600);
  select * into w from workspaces where join_code = p_code;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if v_name = '' then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD'); end if;
  v_min := (p_entry ->> 'minutes')::int;
  v_price := (p_entry ->> 'price_inr')::int;
  if v_min is null or v_min not between 5 and 720 or v_skill = '' then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE'); end if;
  if jsonb_typeof(p_entry -> 'consent') = 'boolean' then v_consent := (p_entry ->> 'consent')::boolean; end if;

  select * into st from staff where ws = w.id and id = p_staff and active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if not st.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  if not (v_skill = any (st.skills)) then return jsonb_build_object('ok', false, 'code', 'WRONG_SKILL'); end if;
  if p_start is null or p_start < w.now_min + w.min_lead_min then return jsonb_build_object('ok', false, 'code', 'TOO_SOON'); end if;
  if p_start < st.shift_start or p_start + v_min > st.shift_end then return jsonb_build_object('ok', false, 'code', 'TARGET_OFF_SHIFT'); end if;

  select * into x from slots where ws = w.id and staff_id = st.id and start_min = p_start and status = 'free' and minutes >= v_min for update;
  if found then
    if exists (select 1 from offers o where o.ws = w.id and o.slot_id = x.id and o.status = 'sent'
               and (o.expires_min is null or o.expires_min > w.now_min)) then
      return jsonb_build_object('ok', false, 'code', 'TAKEN');
    end if;
    sid := x.id;
  else
    if exists (select 1 from slots where ws = w.id and staff_id = st.id and start_min < p_start + v_min and p_start < start_min + minutes) then
      return jsonb_build_object('ok', false, 'code', 'TAKEN');
    end if;
    if (select count(*) from slots where ws = w.id) >= 300 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
    sid := next_id(w.id, 'N', 'slots');
    insert into slots (ws, id, start_min, minutes, skill, status, staff_id, service, price_inr)
    values (w.id, sid, p_start, v_min, v_skill, 'free', st.id, v_service, v_price);
  end if;

  if (select count(*) from waitlist where ws = w.id) >= 300 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
  npos := (select coalesce(max(pos), 0) + 1 from waitlist where ws = w.id);
  nid := 'W' || npos;
  insert into waitlist (ws, id, pos, name, minutes, skill, consent, consent_at, consent_source, service, price_inr,
                        token_hash, source, user_id, status)
  values (w.id, nid, npos, v_name, v_min, v_skill, v_consent, case when v_consent is null then null else now() end,
          case when v_consent is null then null else 'customer booking' end, v_service, v_price,
          hash_key(tok), 'self sign-up', auth.uid(), 'booked');
  insert into bookings (ws, slot_id, entry_id, offer_id) values (w.id, sid, nid, null) returning id into bid;
  update slots set status = 'booked', customer = v_name, refilled = (x.id is not null), cancelled_customer = null,
                   service = coalesce(v_service, service), price_inr = coalesce(v_price, price_inr)
  where ws = w.id and id = sid;
  perform log_event(w.id, 'SELF_BOOKED', case when x.id is null then null else 'REFILLED' end, sid, nid, bid,
    jsonb_build_object('customer', v_name, 'name', st.name, 'start_min', p_start, 'minutes', v_min, 'price_inr', v_price));
  return jsonb_build_object('ok', true, 'token', tok, 'slot', sid);
exception
  -- Two bookings at the same business in the same instant can race for the next number.
  when unique_violation then return jsonb_build_object('ok', false, 'code', 'TRY_AGAIN');
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- 4. The desk books a client who is already waiting: the booking is theirs, so it shows on their
--    page and account, and any offer still out to them is withdrawn. A typed name works as before.
create or replace function public.add_appointment(p_ws uuid, p_key text, p_appt jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; e waitlist; v_now int; s_start int := (p_appt ->> 'start_min')::int; s_min int := (p_appt ->> 'minutes')::int;
        who text := nullif(trim(coalesce(p_appt ->> 'customer', '')), ''); eid text := nullif(p_appt ->> 'entry', ''); nid text; bid bigint;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  if eid is not null then
    select * into e from waitlist where ws = p_ws and id = eid;
    if not found or e.status <> 'waiting' then return jsonb_build_object('ok', false, 'code', 'NOT_WAITING'); end if;
    who := e.name;
  end if;
  select * into st from staff where ws = p_ws and id = p_appt ->> 'staff' and active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if not st.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  if s_start is null or s_min is null or s_min not between 5 and 720 then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE'); end if;
  select now_min into v_now from workspaces where id = p_ws;
  if s_start + s_min <= v_now then return jsonb_build_object('ok', false, 'code', 'TOO_SOON'); end if;
  if s_start < st.shift_start or s_start + s_min > st.shift_end then return jsonb_build_object('ok', false, 'code', 'TARGET_OFF_SHIFT'); end if;
  if (select count(*) from slots where ws = p_ws) >= 300 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
  if exists (select 1 from slots where ws = p_ws and staff_id = st.id
             and start_min < s_start + s_min and s_start < start_min + minutes) then
    return jsonb_build_object('ok', false, 'code', 'TARGET_BUSY');
  end if;
  nid := next_id(p_ws, 'N', 'slots');
  -- Lock order: staff, offers, slots, waitlist.
  if eid is not null then
    update offers set status = 'revoked', responded_at = now() where ws = p_ws and entry_id = eid and status = 'sent';
  end if;
  insert into slots (ws, id, start_min, minutes, skill, status, staff_id, customer, service, price_inr)
  values (p_ws, nid, s_start, s_min, coalesce(nullif(trim(p_appt ->> 'skill'), ''), st.skills[1], 'general'),
          case when who is null then 'free' else 'booked' end, st.id, who, nullif(trim(coalesce(p_appt ->> 'service', '')), ''), (p_appt ->> 'price_inr')::int);
  if eid is not null then
    update waitlist set status = 'booked' where ws = p_ws and id = eid and status = 'waiting';
    if not found then raise exception 'ALREADY_BOOKED'; end if;
    insert into bookings (ws, slot_id, entry_id, offer_id) values (p_ws, nid, eid, null) returning id into bid;
  end if;
  perform log_event(p_ws, case when who is null then 'OPEN_TIME_ADDED' else 'APPOINTMENT_ADDED' end, null, nid, eid, bid,
    jsonb_build_object('staff', st.id, 'name', st.name, 'start_min', s_start, 'minutes', s_min, 'customer', who));
  return jsonb_build_object('ok', true, 'id', nid);
exception
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- 5. The owner renames the business or changes its type.
create or replace function public.update_business(p_ws uuid, p_key text, p_biz jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text := trim(coalesce(p_biz ->> 'name', ''));
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  if v_name = '' then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD'); end if;
  update workspaces set salon = v_name,
         business_type = case when p_biz ? 'type' then nullif(trim(coalesce(p_biz ->> 'type', '')), '') else business_type end
  where id = p_ws;
  perform log_event(p_ws, 'BUSINESS_UPDATED', null, null, null, null, jsonb_build_object('name', v_name));
  return jsonb_build_object('ok', true);
exception
  when check_violation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- 6. The owner deletes a live business: every appointment, client sign-up, offer and log goes
--    with it. They type its name to confirm. A demo day is reset, never deleted from here.
create or replace function public.delete_business(p_ws uuid, p_key text, p_confirm text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select * into w from workspaces where id = p_ws;
  if w.kind <> 'live' then return jsonb_build_object('ok', false, 'code', 'NOT_LIVE'); end if;
  if lower(trim(coalesce(p_confirm, ''))) <> lower(trim(w.salon)) then return jsonb_build_object('ok', false, 'code', 'CONFIRM_MISMATCH'); end if;
  delete from workspaces where id = p_ws;
  return jsonb_build_object('ok', true);
end $$;

-- 7. Anyone deletes their own account. An owner deletes their business first, so nothing is
--    left without an owner by accident. A client's sign-ups stay with each place, unlinked.
create or replace function public.delete_account()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('profile:' || auth.uid(), 60, 600);
  if exists (select 1 from workspaces where owner_user = auth.uid() and kind = 'live') then
    return jsonb_build_object('ok', false, 'code', 'HAS_BUSINESS');
  end if;
  delete from auth.users where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.open_times(text, int, text), public.book_time(text, jsonb, text, int),
  public.add_appointment(uuid, text, jsonb), public.update_business(uuid, text, jsonb),
  public.delete_business(uuid, text, text), public.delete_account()
to anon, authenticated;
