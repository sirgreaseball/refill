-- 005 (v2.1): working hours, moving appointments, a front-desk role, owner policies.
--
-- Roles after this migration, each proven by a key the database checks on every call:
--   owner       everything below, plus team links, the front-desk link, policies and reset.
--   front desk  runs the day: cancellations, offers, consent at the desk, moves, stylists in or out.
--   stylist     their own day and their own in/out status.
--   customer    their own waitlist entry and offers, and a private link to move or cancel a booking.
--
-- Flaw fixed: a stylist's time is now bounded by their working hours. Nothing is moved onto a
-- stylist outside their shift, and free time is only ever offered inside it.
-- New: an appointment can be moved, by the desk while the customer is on the phone, or by the
-- customer from a link that lists only times that truly work. The time they leave opens up
-- for the waitlist. Lock order everywhere: moves, staff, offers, slots, waitlist.

alter table public.workspaces add column desk_hash text;
alter table public.staff
  add column shift_start int not null default 600 check (shift_start between 0 and 1439),
  add column shift_end int not null default 1200 check (shift_end between 1 and 1440),
  add constraint staff_shift_order check (shift_start < shift_end);

create table public.moves (
  id uuid primary key default gen_random_uuid(),
  ws uuid not null references public.workspaces (id) on delete cascade,
  slot_id text not null,
  customer text not null check (char_length(customer) <= 60),
  reason text not null check (reason in ('STAFF_ABSENT', 'CUSTOMER_REQUEST', 'SALON_REQUEST')),
  status text not null default 'open' check (status in ('open', 'moved', 'cancelled', 'withdrawn')),
  to_slot text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  foreign key (ws, slot_id) references public.slots (ws, id) on delete cascade
);
create index moves_ws on public.moves (ws);
create unique index moves_one_open on public.moves (ws, slot_id) where status = 'open';
alter table public.moves enable row level security;
revoke all on table public.moves from anon, authenticated;

-- ------------------------------------------------------------------ roles

create function public.role_of(p_ws uuid, p_key text)
returns text language sql stable set search_path = public, pg_temp as $$
  select case when hash_key(p_key) = owner_hash then 'owner' when hash_key(p_key) = desk_hash then 'desk' end
  from workspaces where id = p_ws;
$$;

create function public.require_desk(p_ws uuid, p_key text)
returns void language plpgsql stable set search_path = public, pg_temp as $$
begin
  if role_of(p_ws, p_key) is null then raise exception 'FORBIDDEN'; end if;
end $$;

-- A stylist's own key, the front desk's or the owner's.
create or replace function public.require_staff(p_ws uuid, p_staff text, p_key text)
returns void language plpgsql stable set search_path = public, pg_temp as $$
begin
  if role_of(p_ws, p_key) is not null then return; end if;
  if not exists (select 1 from staff where ws = p_ws and id = p_staff and key_hash is not null and key_hash = hash_key(p_key)) then
    raise exception 'FORBIDDEN';
  end if;
end $$;

revoke all on function public.role_of(uuid, text) from public, anon, authenticated;
revoke all on function public.require_desk(uuid, text) from public, anon, authenticated;

-- Makes (or replaces) the front desk's key. Only the owner can; the old link stops working.
create function public.desk_link(p_ws uuid, p_key text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare k text := new_key();
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  update workspaces set desk_hash = hash_key(k) where id = p_ws;
  perform log_event(p_ws, 'DESK_LINK_MADE', null, null, null, null, '{}');
  return k;
end $$;

-- Owner only: how long an offer holds, the daily message cap, what counts as a late
-- cancellation, and how close to its start a gap can still be offered.
create function public.set_policy(p_ws uuid, p_key text, p_policy jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  update workspaces set
    hold_min = coalesce((p_policy ->> 'hold_min')::int, hold_min),
    max_offers = coalesce((p_policy ->> 'max_offers')::int, max_offers),
    late_cutoff_min = coalesce((p_policy ->> 'late_cutoff_min')::int, late_cutoff_min),
    min_lead_min = coalesce((p_policy ->> 'min_lead_min')::int, min_lead_min)
  where id = p_ws returning * into w;
  perform log_event(p_ws, 'POLICY_CHANGED', null, null, null, null, jsonb_build_object(
    'hold_min', w.hold_min, 'max_offers', w.max_offers, 'late_cutoff_min', w.late_cutoff_min, 'min_lead_min', w.min_lead_min));
  return jsonb_build_object('ok', true);
exception
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- ------------------------------------------------------------------ the day, now with working hours

create or replace function public.load_day(p_ws uuid, p_day jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if jsonb_array_length(coalesce(p_day -> 'slots', '[]')) > 300
     or jsonb_array_length(coalesce(p_day -> 'waitlist', '[]')) > 300
     or jsonb_array_length(coalesce(p_day -> 'staff', '[]')) > 50 then
    raise exception 'TOO_LARGE';
  end if;
  insert into staff (ws, id, name, skills, present, shift_start, shift_end)
  select p_ws, j ->> 'id', j ->> 'name',
         array(select jsonb_array_elements_text(coalesce(j -> 'skills', '[]'))),
         coalesce((j ->> 'present')::boolean, true),
         coalesce((j ->> 'shift_start')::int, 600), coalesce((j ->> 'shift_end')::int, 1200)
  from jsonb_array_elements(coalesce(p_day -> 'staff', '[]')) j;
  insert into slots (ws, id, start_min, minutes, skill, status, staff_id, customer, service, price_inr)
  select p_ws, j ->> 'id', (j ->> 'start_min')::int, (j ->> 'minutes')::int, j ->> 'skill', j ->> 'status',
         j ->> 'staff', j ->> 'customer', j ->> 'service', (j ->> 'price_inr')::int
  from jsonb_array_elements(coalesce(p_day -> 'slots', '[]')) j;
  insert into waitlist (ws, id, pos, name, minutes, skill, consent, consent_at, consent_source, service, price_inr, free_from, free_until)
  select p_ws, j ->> 'id', t.ord::int, coalesce(nullif(j ->> 'name', ''), j ->> 'id'), (j ->> 'minutes')::int, j ->> 'skill',
         (j ->> 'consent')::boolean,
         case when j ->> 'consent' is not null then now() end,
         case when j ->> 'consent' is not null then 'front desk sign-up' end,
         j ->> 'service', (j ->> 'price_inr')::int, (j ->> 'free_from')::int, (j ->> 'free_until')::int
  from jsonb_array_elements(coalesce(p_day -> 'waitlist', '[]')) with ordinality as t(j, ord);
end $$;

-- ------------------------------------------------------------------ desk functions, owner or front desk

-- Everything the desk shows, plus which role is looking.
create or replace function public.get_state(p_ws uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_desk(p_ws, p_key);
  return (select jsonb_build_object(
    'role', role_of(p_ws, p_key),
    'workspace', to_jsonb(w) - 'owner_hash' - 'desk_hash',
    'staff', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' - 'key_hash' order by s.id) from staff s where s.ws = p_ws), '[]'),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' order by s.start_min, s.staff_id, s.id) from slots s where s.ws = p_ws), '[]'),
    'waitlist', coalesce((select jsonb_agg(to_jsonb(e) - 'ws' - 'token_hash' order by e.pos) from waitlist e where e.ws = p_ws), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) - 'ws' order by o.created_at) from offers o where o.ws = p_ws), '[]'),
    'bookings', coalesce((select jsonb_agg(to_jsonb(b) - 'ws' order by b.id) from bookings b where b.ws = p_ws), '[]'),
    'moves', coalesce((select jsonb_agg(to_jsonb(m) - 'ws' order by m.created_at) from moves m where m.ws = p_ws), '[]'),
    'events', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id desc)
                        from (select * from events where ws = p_ws order by id desc limit 300) v), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

create or replace function public.set_clock(p_ws uuid, p_key text, p_now int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  if p_now is null or p_now < 0 or p_now > 1439 then raise exception 'INVALID_VALUE'; end if;
  update workspaces set now_min = p_now where id = p_ws;
  perform expire_offers(p_ws, p_now);
  return true;
end $$;

create or replace function public.restore_slot(p_ws uuid, p_key text, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; n int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  perform 1 from offers where ws = p_ws and slot_id = p_slot and status = 'sent' order by id for update;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status not in ('free', 'blocked') or s.cancelled_customer is null then return jsonb_build_object('ok', false, 'code', 'NOTHING_TO_UNDO'); end if;
  update offers set status = 'revoked', responded_at = now() where ws = p_ws and slot_id = p_slot and status = 'sent';
  get diagnostics n = row_count;
  update slots set status = 'booked', blocked_reason = null, customer = s.cancelled_customer, cancelled_customer = null
  where ws = p_ws and id = p_slot;
  perform log_event(p_ws, 'CANCEL_UNDONE', null, p_slot, null, null, jsonb_build_object('customer', s.cancelled_customer, 'revoked_offers', n));
  return jsonb_build_object('ok', true, 'revoked_offers', n);
end $$;

create or replace function public.send_offers(p_ws uuid, p_key text, p_slot text, p_entries text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; e waitlist; eid text; code text; v_offer uuid; v_out jsonb := '[]'; v_exp int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  if coalesce(array_length(p_entries, 1), 0) > 50 then raise exception 'TOO_LARGE'; end if;
  select * into w from workspaces where id = p_ws;
  perform expire_offers(p_ws, w.now_min);
  select * into s from slots where ws = p_ws and id = p_slot;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status = 'blocked' then return jsonb_build_object('ok', false, 'code', 'STAFF_ABSENT'); end if;
  if s.status <> 'free' then return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FREE'); end if;
  if s.start_min < w.now_min + w.min_lead_min then return jsonb_build_object('ok', false, 'code', 'SLOT_TOO_SOON'); end if;
  v_exp := least(w.now_min + w.hold_min, s.start_min - w.min_lead_min);
  foreach eid in array coalesce(p_entries, '{}') loop
    select * into e from waitlist where ws = p_ws and id = eid;
    if not found then code := 'UNKNOWN_ENTRY';
    elsif e.status <> 'waiting' then code := 'NOT_WAITING';
    else code := fit_reason(e, s);
    end if;
    if code is null and not exists (select 1 from offers where ws = p_ws and slot_id = p_slot and entry_id = eid and status = 'sent')
       and (select count(*) from offers where ws = p_ws and entry_id = eid) >= w.max_offers then
      code := 'FREQUENCY_CAP';
    end if;
    if code is null then
      insert into offers (ws, slot_id, entry_id, expires_min) values (p_ws, p_slot, eid, v_exp)
      on conflict (ws, slot_id, entry_id) where status = 'sent' do nothing
      returning id into v_offer;
      if v_offer is null then
        select id into v_offer from offers where ws = p_ws and slot_id = p_slot and entry_id = eid and status = 'sent';
      end if;
      perform log_event(p_ws, 'OFFER_SENT', null, p_slot, eid, null, jsonb_build_object('offer', v_offer, 'expires_min', v_exp));
      v_out := v_out || jsonb_build_object('entry', eid, 'outcome', 'SENT', 'offer', v_offer);
    else
      perform log_event(p_ws, 'OFFER_SKIPPED', code, p_slot, eid, null, '{}');
      v_out := v_out || jsonb_build_object('entry', eid, 'outcome', 'SKIPPED', 'code', code);
    end if;
    v_offer := null;
  end loop;
  return jsonb_build_object('ok', true, 'results', v_out);
end $$;

create or replace function public.set_consent(p_ws uuid, p_key text, p_entry text, p_consent boolean, p_source text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  return apply_consent(p_ws, p_entry, p_consent, coalesce(p_source, 'front desk'));
end $$;

create or replace function public.add_entry(p_ws uuid, p_key text, p_entry jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nid text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  if (select count(*) from waitlist where ws = p_ws) >= 300 then raise exception 'TOO_LARGE'; end if;
  nid := coalesce(nullif(p_entry ->> 'id', ''), 'W' || (select coalesce(max(pos), 0) + 1 from waitlist where ws = p_ws));
  insert into waitlist (ws, id, pos, name, minutes, skill, consent, consent_at, consent_source, service, price_inr, free_from, free_until)
  values (p_ws, nid, (select coalesce(max(pos), 0) + 1 from waitlist where ws = p_ws),
          p_entry ->> 'name', (p_entry ->> 'minutes')::int, p_entry ->> 'skill', (p_entry ->> 'consent')::boolean,
          case when p_entry ->> 'consent' is not null then now() end,
          case when p_entry ->> 'consent' is not null then 'front desk' end,
          p_entry ->> 'service', (p_entry ->> 'price_inr')::int, (p_entry ->> 'free_from')::int, (p_entry ->> 'free_until')::int);
  perform log_event(p_ws, 'WAITLIST_ADDED', null, null, nid, null, jsonb_build_object('consent', p_entry -> 'consent', 'source', 'front desk'));
  return jsonb_build_object('ok', true, 'id', nid);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'code', 'DUPLICATE_ID');
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- A cancellation, from the desk or from the customer's own link. With the stylist out, the gap
-- cannot be refilled with them, so it is held until someone moves it to a stylist who is in.
create function public.do_cancel(p_ws uuid, p_slot text, p_by text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; v_lead int; cls text; absent boolean;
begin
  perform 1 from moves where ws = p_ws and slot_id = p_slot and status = 'open' for update;
  select * into w from workspaces where id = p_ws;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'booked' then return jsonb_build_object('ok', false, 'code', 'NOT_BOOKED'); end if;
  if s.start_min + s.minutes <= w.now_min then return jsonb_build_object('ok', false, 'code', 'ALREADY_OVER'); end if;
  v_lead := s.start_min - w.now_min;
  cls := case when v_lead < 0 then 'PAST' when v_lead < w.late_cutoff_min then 'LATE' else 'NORMAL' end;
  absent := exists (select 1 from staff where ws = p_ws and id = s.staff_id and not present);
  update waitlist set status = 'removed'
  where ws = p_ws and id in (select entry_id from bookings where ws = p_ws and slot_id = p_slot and status = 'confirmed');
  update bookings set status = 'cancelled' where ws = p_ws and slot_id = p_slot and status = 'confirmed';
  update slots set status = case when absent then 'blocked' else 'free' end,
                   blocked_reason = case when absent then 'STAFF_ABSENT' end,
                   customer = null, refilled = false,
                   cancelled_customer = case when s.refilled then null else s.customer end
  where ws = p_ws and id = p_slot;
  update moves set status = 'withdrawn', done_at = now() where ws = p_ws and slot_id = p_slot and status = 'open';
  perform log_event(p_ws, 'CANCELLED', cls, p_slot, null, null,
    jsonb_build_object('customer', s.customer, 'notice_min', v_lead, 'price_inr', s.price_inr, 'staff_absent', absent, 'by', p_by));
  return jsonb_build_object('ok', true, 'notice', cls, 'notice_min', v_lead, 'blocked', absent);
end $$;

create or replace function public.cancel_slot(p_ws uuid, p_key text, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  return do_cancel(p_ws, p_slot, 'front desk');
end $$;

-- Give a slot to another stylist at the same time: a booked customer whose stylist is out, or
-- a held gap. The stylist must be in, able to do the service, working then, and free then.
create or replace function public.reassign_slot(p_ws uuid, p_key text, p_slot text, p_to text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; t staff; from_name text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  select * into t from staff where ws = p_ws and id = p_to for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if not t.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.staff_id = p_to then return jsonb_build_object('ok', false, 'code', 'SAME_STYLIST'); end if;
  if s.status = 'booked' and not (s.skill = any (t.skills)) then return jsonb_build_object('ok', false, 'code', 'TARGET_LACKS_SKILL'); end if;
  if s.start_min < t.shift_start or s.start_min + s.minutes > t.shift_end then
    return jsonb_build_object('ok', false, 'code', 'TARGET_OFF_SHIFT');
  end if;
  if exists (select 1 from slots x where x.ws = p_ws and x.staff_id = p_to and x.id <> p_slot
             and x.start_min < s.start_min + s.minutes and x.start_min + x.minutes > s.start_min) then
    return jsonb_build_object('ok', false, 'code', 'TARGET_BUSY');
  end if;
  select name into from_name from staff where ws = p_ws and id = s.staff_id;
  update slots set staff_id = p_to,
                   status = case when status = 'blocked' and blocked_reason = 'STAFF_ABSENT' then 'free' else status end,
                   blocked_reason = null
  where ws = p_ws and id = p_slot;
  perform log_event(p_ws, 'REASSIGNED', null, p_slot, null, null,
    jsonb_build_object('from', from_name, 'to', t.name, 'customer', s.customer, 'was', s.status));
  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------------ moving an appointment

-- Every time this appointment could move to: an open gap left by a cancellation, or working
-- time with nothing booked, held or open. Only stylists who are in, can do the service and are
-- working then. Same time with another stylist first, then by time. Never the past.
create function public.move_options(p_ws uuid, p_slot text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with s as (select * from slots where ws = p_ws and id = p_slot and status = 'booked'),
       w as (select now_min + min_lead_min as earliest from workspaces where id = p_ws),
       st as (select t.* from staff t, s where t.ws = p_ws and t.present and s.skill = any (t.skills)),
       opts as (
         select st.id as staff, st.name, x.start_min, x.id as gap
         from slots x join st on st.id = x.staff_id, s, w
         where x.ws = p_ws and x.id <> s.id and x.status = 'free' and x.minutes >= s.minutes
           and x.start_min >= w.earliest and x.start_min + s.minutes <= st.shift_end
         union all
         select st.id, st.name, t, null
         from st, s, w, generate_series(st.shift_start, st.shift_end - s.minutes, 15) t
         where t >= w.earliest and not (st.id = s.staff_id and t = s.start_min)
           and not exists (select 1 from slots x where x.ws = p_ws and x.staff_id = st.id and x.id <> s.id
                           and x.start_min < t + s.minutes and x.start_min + x.minutes > t)),
       picked as (select o.*, o.start_min = s.start_min as same_time from opts o, s
                  order by o.start_min <> s.start_min, o.start_min, o.name limit 48)
  select coalesce(jsonb_agg(jsonb_build_object('staff', staff, 'name', name, 'start_min', start_min, 'gap', gap, 'same_time', same_time)
                            order by not same_time, start_min, name), '[]')
  from picked;
$$;

-- Moves a booked appointment to (stylist, start): into an open gap if one starts there,
-- otherwise into free time on that stylist's day. The time it leaves opens for the waitlist,
-- or is held if that stylist is out. Every check is repeated under lock.
create function public.apply_move(p_ws uuid, p_slot text, p_staff text, p_start int, p_by text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; t staff; s slots; g slots; nid text; n int := 0; from_absent boolean; from_name text;
begin
  perform 1 from moves where ws = p_ws and slot_id = p_slot and status = 'open' for update;
  select * into w from workspaces where id = p_ws;
  select * into t from staff where ws = p_ws and id = p_staff for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select * into g from slots where ws = p_ws and staff_id = p_staff and start_min = p_start and status = 'free' and id <> p_slot limit 1;
  if g.id is not null then
    perform 1 from offers where ws = p_ws and slot_id = g.id and status = 'sent' order by id for update;
  end if;
  perform 1 from slots where ws = p_ws and id in (p_slot, g.id) order by id for update;
  select * into s from slots where ws = p_ws and id = p_slot;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'booked' then return jsonb_build_object('ok', false, 'code', 'NOT_BOOKED'); end if;
  if s.start_min < w.now_min then return jsonb_build_object('ok', false, 'code', 'ALREADY_STARTED'); end if;
  if not t.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  if not (s.skill = any (t.skills)) then return jsonb_build_object('ok', false, 'code', 'TARGET_LACKS_SKILL'); end if;
  if p_start is null or p_start < w.now_min + w.min_lead_min then return jsonb_build_object('ok', false, 'code', 'TOO_SOON'); end if;
  if p_start < t.shift_start or p_start + s.minutes > t.shift_end then return jsonb_build_object('ok', false, 'code', 'TARGET_OFF_SHIFT'); end if;
  if p_staff = s.staff_id and p_start = s.start_min then return jsonb_build_object('ok', false, 'code', 'SAME_TIME'); end if;
  if g.id is not null then
    select * into g from slots where ws = p_ws and id = g.id;
    if g.status <> 'free' or g.minutes < s.minutes then return jsonb_build_object('ok', false, 'code', 'TARGET_BUSY'); end if;
  end if;
  if exists (select 1 from slots x where x.ws = p_ws and x.staff_id = p_staff and x.id <> s.id and x.id is distinct from g.id
             and x.start_min < p_start + s.minutes and x.start_min + x.minutes > p_start) then
    return jsonb_build_object('ok', false, 'code', 'TARGET_BUSY');
  end if;

  from_absent := exists (select 1 from staff where ws = p_ws and id = s.staff_id and not present);
  select name into from_name from staff where ws = p_ws and id = s.staff_id;
  if g.id is not null then
    update offers set status = 'revoked', responded_at = now() where ws = p_ws and slot_id = g.id and status = 'sent';
    get diagnostics n = row_count;
    update slots set status = 'booked', customer = s.customer, service = s.service, price_inr = s.price_inr,
                     skill = s.skill, refilled = s.refilled, cancelled_customer = null
    where ws = p_ws and id = g.id;
    nid := g.id;
  else
    nid := 'M' || substr(new_key(), 1, 7);
    insert into slots (ws, id, start_min, minutes, skill, status, staff_id, customer, service, price_inr, refilled)
    values (p_ws, nid, p_start, s.minutes, s.skill, 'booked', p_staff, s.customer, s.service, s.price_inr, s.refilled);
  end if;
  update bookings set slot_id = nid where ws = p_ws and slot_id = p_slot and status = 'confirmed';
  update slots set status = case when from_absent then 'blocked' else 'free' end,
                   blocked_reason = case when from_absent then 'STAFF_ABSENT' end,
                   customer = null, refilled = false, cancelled_customer = null
  where ws = p_ws and id = p_slot;
  update moves set status = 'withdrawn', done_at = now() where ws = p_ws and slot_id = p_slot and status = 'open';
  perform log_event(p_ws, 'MOVED', null, p_slot, null, null, jsonb_build_object(
    'customer', s.customer, 'to_slot', nid, 'from_min', s.start_min, 'to_min', p_start, 'minutes', s.minutes,
    'from', from_name, 'to', t.name, 'by', p_by, 'into_gap', g.id is not null, 'revoked_offers', n, 'opened', not from_absent));
  return jsonb_build_object('ok', true, 'slot', nid, 'start_min', p_start, 'staff', t.name, 'opened', not from_absent);
end $$;

-- An open move link for a booked slot, reused if one is already open.
create function public.open_move(p_ws uuid, p_slot text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; mid uuid;
begin
  select * into s from slots where ws = p_ws and id = p_slot;
  if not found or s.status <> 'booked' then return jsonb_build_object('ok', false, 'code', 'NOT_BOOKED'); end if;
  select id into mid from moves where ws = p_ws and slot_id = p_slot and status = 'open';
  if mid is null then
    insert into moves (ws, slot_id, customer, reason) values (p_ws, p_slot, s.customer, p_reason) returning id into mid;
    perform log_event(p_ws, 'MOVE_LINK_SENT', p_reason, p_slot, null, null, jsonb_build_object('customer', s.customer, 'move', mid));
  end if;
  return jsonb_build_object('ok', true, 'move', mid);
exception when unique_violation then
  select id into mid from moves where ws = p_ws and slot_id = p_slot and status = 'open';
  return jsonb_build_object('ok', true, 'move', mid);
end $$;

revoke all on function public.do_cancel(uuid, text, text) from public, anon, authenticated;
revoke all on function public.move_options(uuid, text) from public, anon, authenticated;
revoke all on function public.apply_move(uuid, text, text, int, text) from public, anon, authenticated;
revoke all on function public.open_move(uuid, text, text) from public, anon, authenticated;

-- The desk: where this appointment could go, move it, or send the customer a link to choose.
create function public.get_move_options(p_ws uuid, p_key text, p_slot text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_desk(p_ws, p_key);
  return move_options(p_ws, p_slot);
end $$;

create function public.move_booking(p_ws uuid, p_key text, p_slot text, p_staff text, p_start int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  return apply_move(p_ws, p_slot, p_staff, p_start, 'front desk');
end $$;

create function public.move_link(p_ws uuid, p_key text, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare absent boolean;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  absent := exists (select 1 from slots s join staff t on t.ws = s.ws and t.id = s.staff_id
                    where s.ws = p_ws and s.id = p_slot and not t.present);
  return open_move(p_ws, p_slot, case when absent then 'STAFF_ABSENT' else 'SALON_REQUEST' end);
end $$;

-- The customer's side of a move link: their appointment, why it may need to move, and the
-- times that truly work. The link id is unguessable; it shows nothing about anyone else.
create function public.get_move(p_move uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m moves; s slots; w workspaces; st staff; dest slots; dst staff; live boolean;
begin
  select * into m from moves where id = p_move;
  if not found then return jsonb_build_object('state', 'NOT_FOUND'); end if;
  select * into w from workspaces where id = m.ws;
  select * into s from slots where ws = m.ws and id = m.slot_id;
  select * into st from staff where ws = m.ws and id = s.staff_id;
  live := m.status = 'open' and s.status = 'booked' and s.customer = m.customer;
  if m.to_slot is not null then
    select * into dest from slots where ws = m.ws and id = m.to_slot;
    select * into dst from staff where ws = m.ws and id = dest.staff_id;
  end if;
  return jsonb_build_object(
    'state', case when live then 'open' when m.status = 'open' then 'withdrawn' else m.status end,
    'salon', w.salon, 'now_min', w.now_min, 'reason', m.reason,
    'customer', split_part(m.customer, ' ', 1),
    'current', case when live then jsonb_build_object('start_min', s.start_min, 'minutes', s.minutes, 'service', s.service,
                                                       'stylist', st.name, 'stylist_present', st.present) end,
    'moved_to', case when dest.id is not null then jsonb_build_object('start_min', dest.start_min, 'minutes', dest.minutes,
                                                                      'service', dest.service, 'stylist', dst.name) end,
    'options', case when live then move_options(m.ws, m.slot_id) else '[]'::jsonb end);
end $$;

create function public.choose_move(p_move uuid, p_staff text, p_start int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare m moves; r jsonb;
begin
  perform enforce_rate('move:' || p_move, 30, 60);
  perform enforce_rate('tap:' || client_ip(), 600, 60);
  select * into m from moves where id = p_move for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if m.status <> 'open' then return jsonb_build_object('ok', false, 'code', upper(m.status)); end if;
  if not exists (select 1 from slots where ws = m.ws and id = m.slot_id and status = 'booked' and customer = m.customer) then
    update moves set status = 'withdrawn', done_at = now() where id = p_move;
    return jsonb_build_object('ok', false, 'code', 'WITHDRAWN');
  end if;
  r := apply_move(m.ws, m.slot_id, p_staff, p_start, 'customer');
  if (r ->> 'ok')::boolean then
    update moves set status = 'moved', to_slot = r ->> 'slot', done_at = now() where id = p_move;
  end if;
  return r;
end $$;

create function public.cancel_my_booking(p_move uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare m moves; r jsonb;
begin
  perform enforce_rate('move:' || p_move, 30, 60);
  select * into m from moves where id = p_move for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if m.status <> 'open' then return jsonb_build_object('ok', false, 'code', upper(m.status)); end if;
  if not exists (select 1 from slots where ws = m.ws and id = m.slot_id and status = 'booked' and customer = m.customer) then
    update moves set status = 'withdrawn', done_at = now() where id = p_move;
    return jsonb_build_object('ok', false, 'code', 'WITHDRAWN');
  end if;
  r := do_cancel(m.ws, m.slot_id, 'customer');
  if (r ->> 'ok')::boolean then update moves set status = 'cancelled', done_at = now() where id = p_move; end if;
  return r;
end $$;

-- A customer who booked through Refill asks to change or cancel from their own page.
create function public.my_move(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist; sid text;
begin
  perform enforce_rate('me:' || client_ip(), 120, 60);
  select * into e from waitlist where token_hash = hash_key(p_token);
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select slot_id into sid from bookings where ws = e.ws and entry_id = e.id and status = 'confirmed';
  if sid is null then return jsonb_build_object('ok', false, 'code', 'NO_BOOKING'); end if;
  return open_move(e.ws, sid, 'CUSTOMER_REQUEST');
end $$;

-- The customer's own page, now with their booking once they have one.
create or replace function public.get_my_entry(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when e.id is null then jsonb_build_object('state', 'NOT_FOUND') else jsonb_build_object(
    'state', e.status, 'name', e.name, 'service', e.service, 'minutes', e.minutes, 'price_inr', e.price_inr,
    'consent', e.consent, 'consent_at', e.consent_at, 'consent_source', e.consent_source,
    'free_from', e.free_from, 'free_until', e.free_until, 'salon', w.salon, 'now_min', w.now_min,
    'place', (select count(*) from waitlist x where x.ws = e.ws and x.status = 'waiting' and x.pos <= e.pos),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'start_min', s.start_min, 'minutes', s.minutes,
                          'expires_min', o.expires_min, 'status', o.status, 'slot_status', s.status) order by o.created_at desc)
                        from offers o join slots s on s.ws = o.ws and s.id = o.slot_id
                        where o.ws = e.ws and o.entry_id = e.id), '[]'),
    'booking', (select jsonb_build_object('status', b.status, 'start_min', s.start_min, 'minutes', s.minutes,
                         'service', s.service, 'stylist', t.name, 'stylist_present', t.present)
                from bookings b join slots s on s.ws = b.ws and s.id = b.slot_id
                left join staff t on t.ws = s.ws and t.id = s.staff_id
                where b.ws = e.ws and b.entry_id = e.id order by b.id desc limit 1)
  ) end
  from (select 1) one
  left join waitlist e on e.token_hash = hash_key(p_token)
  left join workspaces w on w.id = e.ws;
$$;

grant execute on function
  public.desk_link(uuid, text), public.set_policy(uuid, text, jsonb),
  public.get_move_options(uuid, text, text), public.move_booking(uuid, text, text, text, int), public.move_link(uuid, text, text),
  public.get_move(uuid), public.choose_move(uuid, text, int), public.cancel_my_booking(uuid), public.my_move(text)
to anon, authenticated;
