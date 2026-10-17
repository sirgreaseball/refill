-- Refill: appointment recovery desk.
-- Browsers never touch tables directly. Every table has row level security on
-- and no policies, so the public key can only call the functions below. Each
-- function re-checks the rules itself; it never trusts what the page decided.
--
-- Lock order, everywhere: offer -> slot -> waitlist entry. One order means two
-- transactions can wait on each other but never deadlock.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  salon text not null default 'Kesar Salon',
  now_min int not null default 600 check (now_min between 0 and 1439),
  late_cutoff_min int not null default 120 check (late_cutoff_min between 0 and 1440),
  min_lead_min int not null default 10 check (min_lead_min between 0 and 240)
);

create table public.staff (
  ws uuid not null references public.workspaces (id) on delete cascade,
  id text not null,
  name text not null,
  skills text[] not null default '{}',
  present boolean not null default true,
  primary key (ws, id)
);

create table public.slots (
  ws uuid not null references public.workspaces (id) on delete cascade,
  id text not null,
  start_min int not null check (start_min between 0 and 1439),
  minutes int not null check (minutes between 1 and 720),
  skill text not null check (skill <> ''),
  status text not null check (status in ('free', 'booked', 'blocked')),
  staff_id text,
  customer text,
  service text,
  price_inr int check (price_inr >= 0),
  refilled boolean not null default false,
  primary key (ws, id)
);

create table public.waitlist (
  ws uuid not null references public.workspaces (id) on delete cascade,
  id text not null check (id <> ''),
  pos int not null,
  name text not null check (name <> ''),
  minutes int not null check (minutes between 1 and 720),
  skill text not null check (skill <> ''),
  consent boolean, -- null = unknown, never treated as yes
  consent_at timestamptz,
  consent_source text,
  service text,
  price_inr int check (price_inr >= 0),
  free_from int check (free_from between 0 and 1439),
  free_until int check (free_until between 0 and 1440),
  status text not null default 'waiting' check (status in ('waiting', 'booked', 'removed')),
  primary key (ws, id)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  ws uuid not null,
  slot_id text not null,
  entry_id text not null,
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'waitlisted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  foreign key (ws, slot_id) references public.slots (ws, id) on delete cascade,
  foreign key (ws, entry_id) references public.waitlist (ws, id) on delete cascade
);
create unique index offers_one_open on public.offers (ws, slot_id, entry_id) where status = 'sent';
create index offers_ws on public.offers (ws);

create table public.bookings (
  id bigint generated always as identity (start with 101) primary key,
  ws uuid not null,
  slot_id text not null,
  entry_id text not null,
  offer_id uuid references public.offers (id) on delete set null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  foreign key (ws, slot_id) references public.slots (ws, id) on delete cascade
);
-- The database's own guarantee: at most one confirmed booking per slot,
-- whatever code path tries to write one.
create unique index bookings_one_per_slot on public.bookings (ws, slot_id) where status = 'confirmed';
create index bookings_ws on public.bookings (ws);

create table public.events (
  id bigint generated always as identity primary key,
  ws uuid not null references public.workspaces (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  code text,
  slot_id text,
  entry_id text,
  booking_id bigint,
  detail jsonb not null default '{}'
);
create index events_ws on public.events (ws, id desc);

alter table public.workspaces enable row level security;
alter table public.staff enable row level security;
alter table public.slots enable row level security;
alter table public.waitlist enable row level security;
alter table public.offers enable row level security;
alter table public.bookings enable row level security;
alter table public.events enable row level security;

-- ------------------------------------------------------------------ helpers

create function public.log_event(p_ws uuid, p_kind text, p_code text, p_slot text, p_entry text,
                                 p_booking bigint, p_detail jsonb)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into events (ws, kind, code, slot_id, entry_id, booking_id, detail)
  values (p_ws, p_kind, p_code, p_slot, p_entry, p_booking, coalesce(p_detail, '{}'));
$$;

-- Same rule order as src/engine.ts reasonFor(): consent, skill, duration, availability.
create function public.fit_reason(e public.waitlist, s public.slots)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case
    when e.consent is distinct from true then 'NO_CONSENT'
    when e.skill <> s.skill then 'SKILL_MISMATCH'
    when e.minutes > s.minutes then 'DURATION_TOO_LONG'
    when e.free_from is not null and s.start_min < e.free_from then 'NOT_AVAILABLE'
    when e.free_until is not null and s.start_min + s.minutes > e.free_until then 'NOT_AVAILABLE'
  end;
$$;

create function public.load_day(p_ws uuid, p_day jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if jsonb_array_length(coalesce(p_day -> 'slots', '[]')) > 300
     or jsonb_array_length(coalesce(p_day -> 'waitlist', '[]')) > 300
     or jsonb_array_length(coalesce(p_day -> 'staff', '[]')) > 50 then
    raise exception 'TOO_LARGE';
  end if;
  insert into staff (ws, id, name, skills, present)
  select p_ws, j ->> 'id', j ->> 'name',
         array(select jsonb_array_elements_text(coalesce(j -> 'skills', '[]'))),
         coalesce((j ->> 'present')::boolean, true)
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
revoke all on function public.load_day(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.log_event(uuid, text, text, text, text, bigint, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------------ workspace

create function public.create_workspace(p_day jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare w uuid;
begin
  insert into workspaces (salon, now_min)
  values (coalesce(nullif(p_day ->> 'salon', ''), 'Kesar Salon'), coalesce((p_day ->> 'now_min')::int, 600))
  returning id into w;
  perform load_day(w, p_day);
  perform log_event(w, 'DAY_LOADED', null, null, null, null,
    jsonb_build_object('slots', jsonb_array_length(coalesce(p_day -> 'slots', '[]')),
                       'waitlist', jsonb_array_length(coalesce(p_day -> 'waitlist', '[]'))));
  return w;
end $$;

create function public.reset_workspace(p_ws uuid, p_day jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
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

create function public.get_state(p_ws uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when w.id is null then null else jsonb_build_object(
    'workspace', to_jsonb(w),
    'staff', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' order by s.id) from staff s where s.ws = p_ws), '[]'),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' order by s.start_min, s.staff_id, s.id) from slots s where s.ws = p_ws), '[]'),
    'waitlist', coalesce((select jsonb_agg(to_jsonb(e) - 'ws' order by e.pos) from waitlist e where e.ws = p_ws), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) - 'ws' order by o.created_at) from offers o where o.ws = p_ws), '[]'),
    'bookings', coalesce((select jsonb_agg(to_jsonb(b) - 'ws' order by b.id) from bookings b where b.ws = p_ws), '[]'),
    'events', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id desc)
                        from (select * from events where ws = p_ws order by id desc limit 300) v), '[]')
  ) end
  from (select 1) one left join workspaces w on w.id = p_ws;
$$;

create function public.set_clock(p_ws uuid, p_now int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_now is null or p_now < 0 or p_now > 1439 then raise exception 'INVALID_VALUE'; end if;
  update workspaces set now_min = p_now where id = p_ws;
  return found;
end $$;

-- ------------------------------------------------------------------ the desk

-- A booked customer cancels. The slot opens; how much notice they gave is recorded.
create function public.cancel_slot(p_ws uuid, p_slot text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; v_lead int; cls text; who text;
begin
  select * into w from workspaces where id = p_ws;
  select * into s from slots where ws = p_ws and id = p_slot for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'booked' then return jsonb_build_object('ok', false, 'code', 'NOT_BOOKED'); end if;
  v_lead := s.start_min - w.now_min;
  cls := case when v_lead < 0 then 'PAST' when v_lead < w.late_cutoff_min then 'LATE' else 'NORMAL' end;
  who := s.customer;
  update bookings set status = 'cancelled' where ws = p_ws and slot_id = p_slot and status = 'confirmed';
  update slots set status = 'free', customer = null, refilled = false where ws = p_ws and id = p_slot;
  perform log_event(p_ws, 'CANCELLED', cls, p_slot, null, null,
    jsonb_build_object('customer', who, 'notice_min', v_lead, 'price_inr', s.price_inr));
  return jsonb_build_object('ok', true, 'notice', cls, 'notice_min', v_lead);
end $$;

-- The owner approves outreach. Every entry is re-checked here; the page's list is only a suggestion.
create function public.send_offers(p_ws uuid, p_slot text, p_entries text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; e waitlist; eid text; code text; v_offer uuid; v_out jsonb := '[]';
begin
  select * into w from workspaces where id = p_ws;
  select * into s from slots where ws = p_ws and id = p_slot;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if s.status <> 'free' then return jsonb_build_object('ok', false, 'code', 'SLOT_NOT_FREE'); end if;
  if s.start_min < w.now_min + w.min_lead_min then return jsonb_build_object('ok', false, 'code', 'SLOT_TOO_SOON'); end if;
  foreach eid in array coalesce(p_entries, '{}') loop
    select * into e from waitlist where ws = p_ws and id = eid;
    if not found then code := 'UNKNOWN_ENTRY';
    elsif e.status <> 'waiting' then code := 'NOT_WAITING';
    else code := fit_reason(e, s);
    end if;
    if code is null then
      insert into offers (ws, slot_id, entry_id) values (p_ws, p_slot, eid)
      on conflict (ws, slot_id, entry_id) where status = 'sent' do nothing
      returning id into v_offer;
      if v_offer is null then
        select id into v_offer from offers where ws = p_ws and slot_id = p_slot and entry_id = eid and status = 'sent';
      end if;
      perform log_event(p_ws, 'OFFER_SENT', null, p_slot, eid, null, jsonb_build_object('offer', v_offer));
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
create function public.accept_offer(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers; s slots; e waitlist; bid bigint; winner bigint; place int; v_now int;
begin
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
  if o.status in ('declined', 'revoked', 'waitlisted') then
    return jsonb_build_object('outcome', upper(o.status));
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

  update slots set status = 'booked', customer = e.name, refilled = true,
                   service = coalesce(e.service, s.service), price_inr = coalesce(e.price_inr, s.price_inr)
  where ws = o.ws and id = o.slot_id;
  update waitlist set status = 'booked' where ws = o.ws and id = o.entry_id;
  update offers set status = 'accepted', responded_at = now() where id = o.id;
  perform log_event(o.ws, 'BOOKED', 'CONFIRMED', o.slot_id, o.entry_id, bid,
    jsonb_build_object('price_inr', coalesce(e.price_inr, s.price_inr)));
  return jsonb_build_object('outcome', 'CONFIRMED', 'booking', bid);
end $$;

create function public.decline_offer(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers;
begin
  select * into o from offers where id = p_offer for update;
  if not found then return jsonb_build_object('outcome', 'NOT_FOUND'); end if;
  if o.status <> 'sent' then return jsonb_build_object('outcome', upper(o.status)); end if;
  update offers set status = 'declined', responded_at = now() where id = p_offer;
  perform log_event(o.ws, 'OFFER_DECLINED', null, o.slot_id, o.entry_id, null, '{}');
  return jsonb_build_object('outcome', 'DECLINED');
end $$;

-- Consent changes. Withdrawing it revokes every open offer at once.
create function public.set_consent(p_ws uuid, p_entry text, p_consent boolean, p_source text)
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

-- The customer replies STOP from the offer page.
create function public.stop_messages(p_offer uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o offers;
begin
  select * into o from offers where id = p_offer;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  return set_consent(o.ws, o.entry_id, false, 'customer replied STOP');
end $$;

create function public.add_entry(p_ws uuid, p_entry jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nid text;
begin
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

-- What the customer's phone sees. Derived live, so a slot taken by someone
-- else shows as taken even before this customer taps anything.
create function public.get_offer(p_offer uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when o.id is null then jsonb_build_object('state', 'NOT_FOUND') else jsonb_build_object(
    'state', case
      when o.status = 'accepted' then 'CONFIRMED'
      when o.status = 'waitlisted' then 'WAITLISTED'
      when o.status = 'declined' then 'DECLINED'
      when o.status = 'revoked' or e.consent is distinct from true then 'NO_CONSENT'
      when s.status <> 'free' then 'TAKEN'
      when e.status <> 'waiting' then 'BOOKED_ELSEWHERE'
      else 'OPEN' end,
    'offer', o.id, 'salon', w.salon,
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

grant execute on function public.create_workspace(jsonb), public.reset_workspace(uuid, jsonb), public.get_state(uuid),
  public.set_clock(uuid, int), public.cancel_slot(uuid, text), public.send_offers(uuid, text, text[]),
  public.accept_offer(uuid), public.decline_offer(uuid), public.set_consent(uuid, text, boolean, text),
  public.stop_messages(uuid), public.add_entry(uuid, jsonb), public.get_offer(uuid)
to anon, authenticated;
