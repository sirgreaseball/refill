-- 002: abuse limits, retention, stricter input, offer hold window, a cap on how
-- often one customer is messaged, and undo for a mistaken cancellation.
-- Every limit is enforced here in the database, not in the page.

-- ------------------------------------------------------------------ abuse limits

-- Where a request comes from. Supabase's gateway forwards the client address.
-- If it is ever missing, every caller shares one bucket: limits get stricter, never looser.
create function public.client_ip()
returns text language sql stable set search_path = public, pg_temp as $$
  select coalesce(
    nullif(trim(split_part(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', ''), ',', 1)), ''),
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-real-ip', ''),
    'unknown');
$$;

create table public.rate_hits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
create index rate_hits_window on public.rate_hits (window_start);
alter table public.rate_hits enable row level security;

-- Fixed-window counter. Over the limit, the whole call is refused (and rolled back).
create function public.enforce_rate(p_key text, p_limit int, p_seconds int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds); n int;
begin
  insert into rate_hits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_hits.hits + 1
  returning hits into n;
  if n > p_limit then
    raise exception 'RATE_LIMITED' using hint = 'Too many requests. Wait a minute and try again.';
  end if;
end $$;

-- Old demo days and old counters are deleted; the app makes a fresh day on the next visit.
create function public.cleanup()
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from workspaces where created_at < now() - interval '3 days';
  delete from rate_hits where window_start < now() - interval '1 hour';
$$;

revoke all on function public.client_ip() from public, anon, authenticated;
revoke all on function public.enforce_rate(text, int, int) from public, anon, authenticated;
revoke all on function public.cleanup() from public, anon, authenticated;

-- ------------------------------------------------------------------ stricter input

alter table public.workspaces add constraint workspaces_salon_len check (char_length(salon) between 1 and 80);
alter table public.staff
  add constraint staff_id_fmt check (id ~ '^[A-Za-z0-9_-]{1,32}$'),
  add constraint staff_name_len check (char_length(name) between 1 and 60 and name !~ '[[:cntrl:]]');
alter table public.slots
  add constraint slots_id_fmt check (id ~ '^[A-Za-z0-9_-]{1,32}$'),
  add constraint slots_text_len check (char_length(skill) <= 24 and coalesce(char_length(customer), 0) <= 60
    and coalesce(char_length(service), 0) <= 60 and coalesce(char_length(staff_id), 0) <= 32
    and coalesce(customer, '') !~ '[[:cntrl:]]');
alter table public.waitlist
  add constraint waitlist_id_fmt check (id ~ '^[A-Za-z0-9_-]{1,32}$'),
  add constraint waitlist_text_len check (char_length(name) <= 60 and name !~ '[[:cntrl:]]' and char_length(skill) <= 24
    and coalesce(char_length(service), 0) <= 60 and coalesce(char_length(consent_source), 0) <= 80);

-- The evidence log can grow and can be cleared with its demo day, but never edited.
create function public.events_append_only()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'EVENTS_ARE_APPEND_ONLY';
end $$;
create trigger events_no_update before update on public.events
  for each row execute function public.events_append_only();

-- ------------------------------------------------------------------ holds, caps, undo

alter table public.workspaces
  add column hold_min int not null default 15 check (hold_min between 1 and 240),
  add column max_offers int not null default 3 check (max_offers between 1 and 20);
alter table public.offers add column expires_min int check (expires_min between 0 and 1440);
alter table public.offers drop constraint offers_status_check;
alter table public.offers add constraint offers_status_check
  check (status in ('sent', 'accepted', 'waitlisted', 'declined', 'revoked', 'expired'));
alter table public.slots add column cancelled_customer text check (coalesce(char_length(cancelled_customer), 0) <= 60);

-- ------------------------------------------------------------------ functions, with limits

create or replace function public.create_workspace(p_day jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare w uuid;
begin
  perform enforce_rate('create:' || client_ip(), 120, 600);
  perform enforce_rate('create:all', 1500, 600);
  if random() < 0.05 then perform cleanup(); end if;
  if (select count(*) from workspaces) >= 20000 then raise exception 'CAPACITY'; end if;
  insert into workspaces (salon, now_min)
  values (coalesce(nullif(p_day ->> 'salon', ''), 'Kesar Salon'), coalesce((p_day ->> 'now_min')::int, 600))
  returning id into w;
  perform load_day(w, p_day);
  perform log_event(w, 'DAY_LOADED', null, null, null, null,
    jsonb_build_object('slots', jsonb_array_length(coalesce(p_day -> 'slots', '[]')),
                       'waitlist', jsonb_array_length(coalesce(p_day -> 'waitlist', '[]'))));
  return w;
end $$;

create or replace function public.reset_workspace(p_ws uuid, p_day jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('reset:' || p_ws, 30, 600);
  perform 1 from workspaces where id = p_ws for update;
  if not found then return false; end if;
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

create or replace function public.set_clock(p_ws uuid, p_now int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  if p_now is null or p_now < 0 or p_now > 1439 then raise exception 'INVALID_VALUE'; end if;
  update workspaces set now_min = p_now where id = p_ws;
  return found;
end $$;

-- A booked customer cancels. The slot opens; how much notice they gave is recorded.
-- Who it was is kept, so a mistaken cancellation can be undone.
create or replace function public.cancel_slot(p_ws uuid, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; v_lead int; cls text; who text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  select * into w from workspaces where id = p_ws;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'booked' then return jsonb_build_object('ok', false, 'code', 'NOT_BOOKED'); end if;
  v_lead := s.start_min - w.now_min;
  cls := case when v_lead < 0 then 'PAST' when v_lead < w.late_cutoff_min then 'LATE' else 'NORMAL' end;
  who := s.customer;
  update bookings set status = 'cancelled' where ws = p_ws and slot_id = p_slot and status = 'confirmed';
  update slots set status = 'free', customer = null, refilled = false,
                   cancelled_customer = case when s.refilled then null else s.customer end
  where ws = p_ws and id = p_slot;
  perform log_event(p_ws, 'CANCELLED', cls, p_slot, null, null,
    jsonb_build_object('customer', who, 'notice_min', v_lead, 'price_inr', s.price_inr));
  return jsonb_build_object('ok', true, 'notice', cls, 'notice_min', v_lead);
end $$;

-- Undo a cancellation pressed by mistake: only while nobody has booked the gap.
-- Open offers for the gap are revoked. Locks offers before the slot (same order as accept_offer).
create function public.restore_slot(p_ws uuid, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; n int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform 1 from offers where ws = p_ws and slot_id = p_slot and status = 'sent' order by id for update;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'free' or s.cancelled_customer is null then return jsonb_build_object('ok', false, 'code', 'NOTHING_TO_UNDO'); end if;
  update offers set status = 'revoked', responded_at = now() where ws = p_ws and slot_id = p_slot and status = 'sent';
  get diagnostics n = row_count;
  update slots set status = 'booked', customer = s.cancelled_customer, cancelled_customer = null where ws = p_ws and id = p_slot;
  perform log_event(p_ws, 'CANCEL_UNDONE', null, p_slot, null, null, jsonb_build_object('customer', s.cancelled_customer, 'revoked_offers', n));
  return jsonb_build_object('ok', true, 'revoked_offers', n);
end $$;

-- The owner approves outreach. Every entry is re-checked here; the page's list is only a suggestion.
-- Each offer holds for hold_min demo-minutes (never past the slot's start), and nobody is
-- messaged more than max_offers times in a day.
create or replace function public.send_offers(p_ws uuid, p_slot text, p_entries text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; e waitlist; eid text; code text; v_offer uuid; v_out jsonb := '[]'; v_exp int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  if coalesce(array_length(p_entries, 1), 0) > 50 then raise exception 'TOO_LARGE'; end if;
  select * into w from workspaces where id = p_ws;
  select * into s from slots where ws = p_ws and id = p_slot;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
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

-- A customer taps Accept. Exactly one confirmed booking per slot, even when
-- several taps land in the same millisecond: the slot row lock queues them,
-- the first finds the slot free, the rest find it booked and keep their place.
-- An offer past its hold window is refused.
create or replace function public.accept_offer(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers; s slots; e waitlist; bid bigint; winner bigint; place int; v_now int;
begin
  perform enforce_rate('tap:' || client_ip(), 600, 60);
  perform enforce_rate('offer:' || p_offer, 30, 60);
  select * into o from offers where id = p_offer for update;
  if not found then return jsonb_build_object('outcome', 'NOT_FOUND'); end if;
  select * into s from slots where ws = o.ws and id = o.slot_id for update;
  select * into e from waitlist where ws = o.ws and id = o.entry_id for update;
  select w.now_min into v_now from workspaces w where w.id = o.ws;

  if o.status = 'accepted' then -- the same tap twice: still one booking
    select id into bid from bookings where offer_id = o.id and status = 'confirmed';
    perform log_event(o.ws, 'ACCEPT_REPEATED', 'ALREADY_CONFIRMED', o.slot_id, o.entry_id, bid, '{}');
    return jsonb_build_object('outcome', 'ALREADY_CONFIRMED', 'booking', bid);
  end if;
  if o.status in ('declined', 'revoked', 'waitlisted', 'expired') then
    return jsonb_build_object('outcome', upper(o.status));
  end if;
  if o.expires_min is not null and v_now >= o.expires_min then
    update offers set status = 'expired', responded_at = now() where id = o.id;
    perform log_event(o.ws, 'ACCEPT_REJECTED', 'OFFER_EXPIRED', o.slot_id, o.entry_id, null, jsonb_build_object('expires_min', o.expires_min));
    return jsonb_build_object('outcome', 'EXPIRED');
  end if;
  if e.consent is distinct from true then -- consent re-checked at the moment of booking
    update offers set status = 'revoked', responded_at = now() where id = o.id;
    perform log_event(o.ws, 'ACCEPT_REJECTED', 'NO_CONSENT', o.slot_id, o.entry_id, null, '{}');
    return jsonb_build_object('outcome', 'REJECTED', 'code', 'NO_CONSENT');
  end if;
  if e.status <> 'waiting' then
    update offers set status = 'revoked', responded_at = now() where id = o.id;
    perform log_event(o.ws, 'ACCEPT_REJECTED', 'ALREADY_BOOKED', o.slot_id, o.entry_id, null, '{}');
    return jsonb_build_object('outcome', 'REJECTED', 'code', 'ALREADY_BOOKED');
  end if;
  if fit_reason(e, s) is not null then
    update offers set status = 'revoked', responded_at = now() where id = o.id;
    perform log_event(o.ws, 'ACCEPT_REJECTED', fit_reason(e, s), o.slot_id, o.entry_id, null, '{}');
    return jsonb_build_object('outcome', 'REJECTED', 'code', fit_reason(e, s));
  end if;
  if s.status = 'blocked' or s.start_min < v_now then
    update offers set status = 'revoked', responded_at = now() where id = o.id;
    perform log_event(o.ws, 'ACCEPT_REJECTED', 'SLOT_UNAVAILABLE', o.slot_id, o.entry_id, null, '{}');
    return jsonb_build_object('outcome', 'REJECTED', 'code', 'SLOT_UNAVAILABLE');
  end if;

  if s.status = 'free' then
    begin
      insert into bookings (ws, slot_id, entry_id, offer_id) values (o.ws, o.slot_id, o.entry_id, o.id)
      returning id into bid;
    exception when unique_violation then
      bid := null; -- unreachable while the slot lock is held; the index is the backstop
    end;
  end if;

  if bid is null then -- someone else got there first: keep this customer's place in the queue
    select id into winner from bookings where ws = o.ws and slot_id = o.slot_id and status = 'confirmed';
    update offers set status = 'waitlisted', responded_at = now() where id = o.id;
    select count(*) into place from waitlist where ws = o.ws and status = 'waiting' and pos <= e.pos;
    perform log_event(o.ws, 'WAITLIST_RETAINED', 'LOST_RACE', o.slot_id, o.entry_id, winner,
      jsonb_build_object('lost_to', winner, 'place', place));
    return jsonb_build_object('outcome', 'WAITLISTED', 'lost_to', winner, 'place', place);
  end if;

  update slots set status = 'booked', customer = e.name, refilled = true, cancelled_customer = null,
                   service = coalesce(e.service, s.service), price_inr = coalesce(e.price_inr, s.price_inr)
  where ws = o.ws and id = o.slot_id;
  update waitlist set status = 'booked' where ws = o.ws and id = o.entry_id;
  update offers set status = 'accepted', responded_at = now() where id = o.id;
  perform log_event(o.ws, 'BOOKED', 'CONFIRMED', o.slot_id, o.entry_id, bid,
    jsonb_build_object('price_inr', coalesce(e.price_inr, s.price_inr)));
  return jsonb_build_object('outcome', 'CONFIRMED', 'booking', bid);
end $$;

create or replace function public.decline_offer(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers;
begin
  perform enforce_rate('tap:' || client_ip(), 600, 60);
  perform enforce_rate('offer:' || p_offer, 30, 60);
  select * into o from offers where id = p_offer for update;
  if not found then return jsonb_build_object('outcome', 'NOT_FOUND'); end if;
  if o.status <> 'sent' then return jsonb_build_object('outcome', upper(o.status)); end if;
  update offers set status = 'declined', responded_at = now() where id = p_offer;
  perform log_event(o.ws, 'OFFER_DECLINED', null, o.slot_id, o.entry_id, null, '{}');
  return jsonb_build_object('outcome', 'DECLINED');
end $$;

create or replace function public.set_consent(p_ws uuid, p_entry text, p_consent boolean, p_source text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare n int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
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

create or replace function public.stop_messages(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers;
begin
  perform enforce_rate('offer:' || p_offer, 30, 60);
  select * into o from offers where id = p_offer;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  return set_consent(o.ws, o.entry_id, false, 'customer replied STOP');
end $$;

create or replace function public.add_entry(p_ws uuid, p_entry jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nid text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  if (select count(*) from waitlist where ws = p_ws) >= 300 then raise exception 'TOO_LARGE'; end if;
  nid := coalesce(nullif(p_entry ->> 'id', ''), 'W' || (select coalesce(max(pos), 0) + 1 from waitlist where ws = p_ws));
  insert into waitlist (ws, id, pos, name, minutes, skill, consent, consent_at, consent_source, service, price_inr, free_from, free_until)
  values (p_ws, nid, (select coalesce(max(pos), 0) + 1 from waitlist where ws = p_ws),
          p_entry ->> 'name', (p_entry ->> 'minutes')::int, p_entry ->> 'skill', (p_entry ->> 'consent')::boolean,
          case when p_entry ->> 'consent' is not null then now() end,
          case when p_entry ->> 'consent' is not null then 'front desk' end,
          p_entry ->> 'service', (p_entry ->> 'price_inr')::int, (p_entry ->> 'free_from')::int, (p_entry ->> 'free_until')::int);
  perform log_event(p_ws, 'WAITLIST_ADDED', null, null, nid, null, jsonb_build_object('consent', p_entry -> 'consent'));
  return jsonb_build_object('ok', true, 'id', nid);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'code', 'DUPLICATE_ID');
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

create or replace function public.get_offer(p_offer uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when o.id is null then jsonb_build_object('state', 'NOT_FOUND') else jsonb_build_object(
    'state', case
      when o.status = 'accepted' then 'CONFIRMED'
      when o.status = 'waitlisted' then 'WAITLISTED'
      when o.status = 'declined' then 'DECLINED'
      when o.status = 'revoked' or e.consent is distinct from true then 'NO_CONSENT'
      when o.status = 'expired' or (o.expires_min is not null and w.now_min >= o.expires_min) then 'EXPIRED'
      when s.status <> 'free' then 'TAKEN'
      when e.status <> 'waiting' then 'BOOKED_ELSEWHERE'
      else 'OPEN' end,
    'offer', o.id, 'salon', w.salon, 'expires_min', o.expires_min, 'now_min', w.now_min,
    'slot', jsonb_build_object('id', s.id, 'start_min', s.start_min, 'minutes', s.minutes, 'skill', s.skill,
                               'staff', (select name from staff where ws = o.ws and id = s.staff_id)),
    'entry', jsonb_build_object('name', e.name, 'service', e.service, 'minutes', e.minutes, 'price_inr', e.price_inr,
                                'consent_at', e.consent_at, 'consent_source', e.consent_source),
    'booking', (select id from bookings where offer_id = o.id and status = 'confirmed'),
    'winner', (select id from bookings where ws = o.ws and slot_id = o.slot_id and status = 'confirmed'),
    'place', (select count(*) from waitlist x where x.ws = o.ws and x.status = 'waiting' and x.pos <= e.pos)
  ) end
  from (select 1) one
  left join offers o on o.id = p_offer
  left join slots s on s.ws = o.ws and s.id = o.slot_id
  left join waitlist e on e.ws = o.ws and e.id = o.entry_id
  left join workspaces w on w.id = o.ws;
$$;

grant execute on function public.restore_slot(uuid, text) to anon, authenticated;
