-- 004 (v2): who may do what, staff-aware matching, staff absence, customer self sign-up.
--
-- Roles, each proven by a key the database checks on every call:
--   owner    the desk. Key made when the demo day is created; only its SHA-256 is stored.
--   stylist  their own day and their own in/out status. Key made by the owner per stylist.
--   customer joins the waitlist with the salon's public join code, then manages their
--            own entry with a private token. Offers stay capability links (unguessable ids).
-- Matching is now staff-aware: a freed slot belongs to its stylist's time, so it can go to
-- anyone whose service that stylist can do, and an absent stylist's slots are never offered.

create function public.hash_key(p text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select encode(sha256(convert_to(coalesce(p, ''), 'UTF8')), 'hex');
$$;

create function public.new_key()
returns text language sql volatile set search_path = public, pg_temp as $$
  select replace(gen_random_uuid()::text, '-', '');
$$;

alter table public.workspaces add column owner_hash text, add column join_code text unique;
alter table public.staff add column key_hash text;
alter table public.waitlist
  add column token_hash text unique,
  add column source text not null default 'front desk' check (source in ('front desk', 'self sign-up'));
alter table public.slots add column blocked_reason text check (blocked_reason in ('STAFF_ABSENT'));

create function public.is_owner(p_ws uuid, p_key text)
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists (select 1 from workspaces where id = p_ws and owner_hash is not null and owner_hash = hash_key(p_key));
$$;

create function public.require_owner(p_ws uuid, p_key text)
returns void language plpgsql stable set search_path = public, pg_temp as $$
begin
  if not is_owner(p_ws, p_key) then raise exception 'FORBIDDEN'; end if;
end $$;

-- A stylist's own key, or the owner's key.
create function public.require_staff(p_ws uuid, p_staff text, p_key text)
returns void language plpgsql stable set search_path = public, pg_temp as $$
begin
  if is_owner(p_ws, p_key) then return; end if;
  if not exists (select 1 from staff where ws = p_ws and id = p_staff and key_hash is not null and key_hash = hash_key(p_key)) then
    raise exception 'FORBIDDEN';
  end if;
end $$;

-- v2 matching. Same order as src/engine.ts reasonFor(): consent, skill, duration, availability.
-- Skill: what the slot's stylist can do; without a known stylist, the slot's own service.
create or replace function public.fit_reason(e public.waitlist, s public.slots)
returns text language sql stable set search_path = public, pg_temp as $$
  select case
    when e.consent is distinct from true then 'NO_CONSENT'
    when not coalesce((select e.skill = any (st.skills) from staff st where st.ws = s.ws and st.id = s.staff_id), e.skill = s.skill) then 'SKILL_MISMATCH'
    when e.minutes > s.minutes then 'DURATION_TOO_LONG'
    when e.free_from is not null and s.start_min < e.free_from then 'NOT_AVAILABLE'
    when e.free_until is not null and s.start_min + s.minutes > e.free_until then 'NOT_AVAILABLE'
  end;
$$;

-- Consent changes from any role go through here. Withdrawing revokes every open offer at once.
create function public.apply_consent(p_ws uuid, p_entry text, p_consent boolean, p_source text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare n int := 0;
begin
  perform 1 from offers where ws = p_ws and entry_id = p_entry and status = 'sent' order by id for update;
  update waitlist set consent = p_consent, consent_at = now(), consent_source = left(coalesce(p_source, 'front desk'), 80)
  where ws = p_ws and id = p_entry;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if p_consent is distinct from true then
    update offers set status = 'revoked', responded_at = now() where ws = p_ws and entry_id = p_entry and status = 'sent';
    get diagnostics n = row_count;
  end if;
  perform log_event(p_ws, case when p_consent then 'CONSENT_GIVEN' when p_consent is null then 'CONSENT_UNKNOWN' else 'CONSENT_WITHDRAWN' end,
    null, null, p_entry, null, jsonb_build_object('source', p_source, 'revoked_offers', n));
  return jsonb_build_object('ok', true, 'revoked_offers', n);
end $$;

revoke all on function public.hash_key(text) from public, anon, authenticated;
revoke all on function public.new_key() from public, anon, authenticated;
revoke all on function public.is_owner(uuid, text) from public, anon, authenticated;
revoke all on function public.require_owner(uuid, text) from public, anon, authenticated;
revoke all on function public.require_staff(uuid, text, text) from public, anon, authenticated;
revoke all on function public.apply_consent(uuid, text, boolean, text) from public, anon, authenticated;
revoke all on function public.fit_reason(public.waitlist, public.slots) from public, anon, authenticated;

-- ------------------------------------------------------------------ owner functions (now keyed)

drop function public.create_workspace(jsonb);
drop function public.reset_workspace(uuid, jsonb);
drop function public.get_state(uuid);
drop function public.set_clock(uuid, int);
drop function public.cancel_slot(uuid, text);
drop function public.restore_slot(uuid, text);
drop function public.send_offers(uuid, text, text[]);
drop function public.set_consent(uuid, text, boolean, text);
drop function public.add_entry(uuid, jsonb);

-- Returns the owner key once. Only its hash is kept.
create function public.create_workspace(p_day jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w uuid; k text := new_key(); code text := substr(new_key(), 1, 8);
begin
  perform enforce_rate('create:' || client_ip(), 120, 600);
  perform enforce_rate('create:all', 1500, 600);
  if random() < 0.05 then perform cleanup(); end if;
  if (select count(*) from workspaces) >= 20000 then raise exception 'CAPACITY'; end if;
  insert into workspaces (salon, now_min, owner_hash, join_code)
  values (coalesce(nullif(p_day ->> 'salon', ''), 'Kesar Salon'), coalesce((p_day ->> 'now_min')::int, 600), hash_key(k), code)
  returning id into w;
  perform load_day(w, p_day);
  perform log_event(w, 'DAY_LOADED', null, null, null, null,
    jsonb_build_object('slots', jsonb_array_length(coalesce(p_day -> 'slots', '[]')),
                       'waitlist', jsonb_array_length(coalesce(p_day -> 'waitlist', '[]'))));
  return jsonb_build_object('id', w, 'owner_key', k, 'join_code', code);
end $$;

create function public.reset_workspace(p_ws uuid, p_key text, p_day jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('reset:' || p_ws, 30, 600);
  perform require_owner(p_ws, p_key);
  perform 1 from workspaces where id = p_ws for update;
  delete from bookings where ws = p_ws;
  delete from offers where ws = p_ws;
  delete from events where ws = p_ws;
  delete from waitlist where ws = p_ws;
  delete from slots where ws = p_ws;
  delete from staff where ws = p_ws;
  update workspaces set now_min = coalesce((p_day ->> 'now_min')::int, 600) where id = p_ws;
  perform load_day(p_ws, p_day);
  perform log_event(p_ws, 'DAY_LOADED', 'RESET', null, null, null, '{}');
  return true;
end $$;

-- Everything the desk shows. Owner only: it holds every customer's name and consent.
create function public.get_state(p_ws uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_owner(p_ws, p_key);
  return (select jsonb_build_object(
    'workspace', to_jsonb(w) - 'owner_hash',
    'staff', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' - 'key_hash' order by s.id) from staff s where s.ws = p_ws), '[]'),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' order by s.start_min, s.staff_id, s.id) from slots s where s.ws = p_ws), '[]'),
    'waitlist', coalesce((select jsonb_agg(to_jsonb(e) - 'ws' - 'token_hash' order by e.pos) from waitlist e where e.ws = p_ws), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) - 'ws' order by o.created_at) from offers o where o.ws = p_ws), '[]'),
    'bookings', coalesce((select jsonb_agg(to_jsonb(b) - 'ws' order by b.id) from bookings b where b.ws = p_ws), '[]'),
    'events', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id desc)
                        from (select * from events where ws = p_ws order by id desc limit 300) v), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

create function public.set_clock(p_ws uuid, p_key text, p_now int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  if p_now is null or p_now < 0 or p_now > 1439 then raise exception 'INVALID_VALUE'; end if;
  update workspaces set now_min = p_now where id = p_ws;
  perform expire_offers(p_ws, p_now);
  return true;
end $$;

-- A booked customer cancels. With the stylist out, the gap cannot be refilled with them,
-- so it is blocked until the owner moves it to someone who is in.
create function public.cancel_slot(p_ws uuid, p_key text, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; v_lead int; cls text; who text; absent boolean;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select * into w from workspaces where id = p_ws;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'booked' then return jsonb_build_object('ok', false, 'code', 'NOT_BOOKED'); end if;
  v_lead := s.start_min - w.now_min;
  cls := case when v_lead < 0 then 'PAST' when v_lead < w.late_cutoff_min then 'LATE' else 'NORMAL' end;
  who := s.customer;
  absent := exists (select 1 from staff where ws = p_ws and id = s.staff_id and not present);
  update bookings set status = 'cancelled' where ws = p_ws and slot_id = p_slot and status = 'confirmed';
  update slots set status = case when absent then 'blocked' else 'free' end,
                   blocked_reason = case when absent then 'STAFF_ABSENT' end,
                   customer = null, refilled = false,
                   cancelled_customer = case when s.refilled then null else s.customer end
  where ws = p_ws and id = p_slot;
  perform log_event(p_ws, 'CANCELLED', cls, p_slot, null, null,
    jsonb_build_object('customer', who, 'notice_min', v_lead, 'price_inr', s.price_inr, 'staff_absent', absent));
  return jsonb_build_object('ok', true, 'notice', cls, 'notice_min', v_lead, 'blocked', absent);
end $$;

create function public.restore_slot(p_ws uuid, p_key text, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; n int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
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

create function public.send_offers(p_ws uuid, p_key text, p_slot text, p_entries text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; e waitlist; eid text; code text; v_offer uuid; v_out jsonb := '[]'; v_exp int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
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

create function public.set_consent(p_ws uuid, p_key text, p_entry text, p_consent boolean, p_source text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  return apply_consent(p_ws, p_entry, p_consent, coalesce(p_source, 'front desk'));
end $$;

create or replace function public.stop_messages(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers;
begin
  perform enforce_rate('offer:' || p_offer, 30, 60);
  select * into o from offers where id = p_offer;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  return apply_consent(o.ws, o.entry_id, false, 'customer replied STOP');
end $$;

create function public.add_entry(p_ws uuid, p_key text, p_entry jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nid text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
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

-- ------------------------------------------------------------------ stylists

-- Makes (or replaces) a stylist's personal key. The owner shares the link it builds.
create function public.staff_link(p_ws uuid, p_key text, p_staff text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare k text := new_key();
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  update staff set key_hash = hash_key(k) where ws = p_ws and id = p_staff;
  if not found then raise exception 'NOT_FOUND'; end if;
  return k;
end $$;

-- A stylist's own day: their slots, customers by first name only.
create function public.get_staff_day(p_ws uuid, p_staff text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_staff(p_ws, p_staff, p_key);
  return (select jsonb_build_object(
    'salon', w.salon, 'now_min', w.now_min,
    'staff', (select jsonb_build_object('id', st.id, 'name', st.name, 'skills', st.skills, 'present', st.present) from staff st where st.ws = p_ws and st.id = p_staff),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'start_min', s.start_min, 'minutes', s.minutes, 'service', s.service,
                         'status', s.status, 'refilled', s.refilled, 'blocked_reason', s.blocked_reason,
                         'customer', split_part(coalesce(s.customer, ''), ' ', 1)) order by s.start_min)
                       from slots s where s.ws = p_ws and s.staff_id = p_staff), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

-- In or out today. Out: open offers on their slots are revoked and their free slots are
-- blocked; their booked customers show as needing action on the desk. Back in: unblocked.
-- Lock order: staff, then offers, then slots.
create function public.set_staff_presence(p_ws uuid, p_staff text, p_key text, p_present boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; v_now int; n_blocked int := 0; n_freed int := 0; n_revoked int := 0; n_risk int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_staff(p_ws, p_staff, p_key);
  if p_present is null then raise exception 'INVALID_VALUE'; end if;
  select * into st from staff where ws = p_ws and id = p_staff for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select now_min into v_now from workspaces where id = p_ws;
  if p_present then
    update slots set status = 'free', blocked_reason = null
    where ws = p_ws and staff_id = p_staff and status = 'blocked' and blocked_reason = 'STAFF_ABSENT';
    get diagnostics n_freed = row_count;
  else
    perform 1 from offers o where o.ws = p_ws and o.status = 'sent'
      and o.slot_id in (select id from slots where ws = p_ws and staff_id = p_staff) order by o.id for update;
    update offers set status = 'revoked', responded_at = now()
    where ws = p_ws and status = 'sent' and slot_id in (select id from slots where ws = p_ws and staff_id = p_staff);
    get diagnostics n_revoked = row_count;
    update slots set status = 'blocked', blocked_reason = 'STAFF_ABSENT'
    where ws = p_ws and staff_id = p_staff and status = 'free' and start_min + minutes > v_now;
    get diagnostics n_blocked = row_count;
    select count(*) into n_risk from slots where ws = p_ws and staff_id = p_staff and status = 'booked' and start_min >= v_now;
  end if;
  update staff set present = p_present where ws = p_ws and id = p_staff;
  perform log_event(p_ws, case when p_present then 'STAFF_BACK' else 'STAFF_ABSENT' end, null, null, null, null,
    jsonb_build_object('staff', p_staff, 'name', st.name, 'blocked', n_blocked, 'freed', n_freed, 'revoked_offers', n_revoked, 'at_risk', n_risk));
  return jsonb_build_object('ok', true, 'blocked', n_blocked, 'freed', n_freed, 'revoked_offers', n_revoked, 'at_risk', n_risk);
end $$;

-- Move an appointment, or a blocked gap, to a stylist who is in, can do the service and
-- has nothing else at that time. The target stylist's row is locked first, so two moves
-- onto the same stylist cannot overlap.
create function public.reassign_slot(p_ws uuid, p_key text, p_slot text, p_to text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; t staff; from_name text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select * into t from staff where ws = p_ws and id = p_to for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if not t.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.staff_id = p_to then return jsonb_build_object('ok', false, 'code', 'SAME_STYLIST'); end if;
  if s.status = 'booked' and not (s.skill = any (t.skills)) then return jsonb_build_object('ok', false, 'code', 'TARGET_LACKS_SKILL'); end if;
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

-- ------------------------------------------------------------------ customers

create function public.join_info(p_code text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when w.id is null then jsonb_build_object('ok', false) else jsonb_build_object('ok', true, 'salon', w.salon) end
  from (select 1) one left join workspaces w on w.join_code = p_code;
$$;

-- A customer adds themselves. Consent must be an explicit yes or no; it is never defaulted.
create function public.join_waitlist(p_code text, p_entry jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; tok text := new_key(); nid text; npos int; place int;
begin
  perform enforce_rate('join:' || client_ip(), 30, 600);
  select * into w from workspaces where join_code = p_code;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if jsonb_typeof(p_entry -> 'consent') is distinct from 'boolean' then
    return jsonb_build_object('ok', false, 'code', 'CONSENT_CHOICE_REQUIRED');
  end if;
  if (select count(*) from waitlist where ws = w.id) >= 300 then raise exception 'TOO_LARGE'; end if;
  npos := (select coalesce(max(pos), 0) + 1 from waitlist where ws = w.id);
  nid := 'W' || npos;
  insert into waitlist (ws, id, pos, name, minutes, skill, consent, consent_at, consent_source, service, price_inr,
                        free_from, free_until, token_hash, source)
  values (w.id, nid, npos, trim(p_entry ->> 'name'), (p_entry ->> 'minutes')::int, p_entry ->> 'skill', (p_entry ->> 'consent')::boolean,
          now(), 'customer sign-up', p_entry ->> 'service', (p_entry ->> 'price_inr')::int,
          (p_entry ->> 'free_from')::int, (p_entry ->> 'free_until')::int, hash_key(tok), 'self sign-up');
  perform log_event(w.id, 'WAITLIST_ADDED', null, null, nid, null, jsonb_build_object('consent', p_entry -> 'consent', 'source', 'self sign-up'));
  select count(*) into place from waitlist where ws = w.id and status = 'waiting' and pos <= npos;
  return jsonb_build_object('ok', true, 'token', tok, 'place', place);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'code', 'DUPLICATE_ID');
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- The customer's own page: their place, their consent, their offers. Nothing about anyone else.
create function public.get_my_entry(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when e.id is null then jsonb_build_object('state', 'NOT_FOUND') else jsonb_build_object(
    'state', e.status, 'name', e.name, 'service', e.service, 'minutes', e.minutes, 'price_inr', e.price_inr,
    'consent', e.consent, 'consent_at', e.consent_at, 'consent_source', e.consent_source,
    'free_from', e.free_from, 'free_until', e.free_until, 'salon', w.salon, 'now_min', w.now_min,
    'place', (select count(*) from waitlist x where x.ws = e.ws and x.status = 'waiting' and x.pos <= e.pos),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'start_min', s.start_min, 'minutes', s.minutes,
                          'expires_min', o.expires_min, 'status', o.status, 'slot_status', s.status) order by o.created_at desc)
                        from offers o join slots s on s.ws = o.ws and s.id = o.slot_id
                        where o.ws = e.ws and o.entry_id = e.id), '[]')
  ) end
  from (select 1) one
  left join waitlist e on e.token_hash = hash_key(p_token)
  left join workspaces w on w.id = e.ws;
$$;

create function public.set_my_consent(p_token text, p_consent boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist;
begin
  perform enforce_rate('me:' || client_ip(), 120, 60);
  if p_consent is null then raise exception 'INVALID_VALUE'; end if;
  select * into e from waitlist where token_hash = hash_key(p_token);
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  return apply_consent(e.ws, e.id, p_consent, 'customer, own page');
end $$;

create function public.leave_waitlist(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist; n int := 0;
begin
  perform enforce_rate('me:' || client_ip(), 120, 60);
  select * into e from waitlist where token_hash = hash_key(p_token);
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  perform 1 from offers where ws = e.ws and entry_id = e.id and status = 'sent' order by id for update;
  update offers set status = 'revoked', responded_at = now() where ws = e.ws and entry_id = e.id and status = 'sent';
  get diagnostics n = row_count;
  update waitlist set status = 'removed' where ws = e.ws and id = e.id and status = 'waiting';
  perform log_event(e.ws, 'WAITLIST_LEFT', null, null, e.id, null, jsonb_build_object('revoked_offers', n));
  return jsonb_build_object('ok', true);
end $$;

grant execute on function
  public.create_workspace(jsonb), public.reset_workspace(uuid, text, jsonb), public.get_state(uuid, text),
  public.set_clock(uuid, text, int), public.cancel_slot(uuid, text, text), public.restore_slot(uuid, text, text),
  public.send_offers(uuid, text, text, text[]), public.set_consent(uuid, text, text, boolean, text),
  public.add_entry(uuid, text, jsonb), public.staff_link(uuid, text, text), public.get_staff_day(uuid, text, text),
  public.set_staff_presence(uuid, text, text, boolean), public.reassign_slot(uuid, text, text, text),
  public.join_info(text), public.join_waitlist(text, jsonb), public.get_my_entry(text),
  public.set_my_consent(text, boolean), public.leave_waitlist(text)
to anon, authenticated;
