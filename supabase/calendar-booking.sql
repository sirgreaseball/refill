-- LOCAL REVIEW DRAFT. Not applied to any database.
-- Apply after migrations 001-012 only after review and explicit deployment approval.
-- Future reservations live outside the same-day recovery book. At the India-date
-- rollover they enter the existing slots/bookings tables, so absence cover, offers,
-- moves and cancellations continue to use the established same-day rules.
-- Future availability repeats the staff member's configured daily shift. Today's
-- in/out flag is not a promise about their attendance on a future date.
begin;

create table public.future_appointments (
  id uuid primary key default gen_random_uuid(),
  ws uuid not null references public.workspaces(id) on delete cascade,
  entry_id text not null,
  staff_id text not null,
  day date not null,
  start_min int not null check (start_min between 0 and 1439),
  minutes int not null check (minutes between 5 and 720 and start_min + minutes <= 1440),
  skill text not null check (skill <> ''),
  service text,
  price_inr int check (price_inr >= 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'promoted')),
  created_at timestamptz not null default now(),
  foreign key (ws, entry_id) references public.waitlist(ws, id) on delete cascade,
  unique (ws, entry_id)
);
create index future_appointments_staff_day on public.future_appointments(ws, staff_id, day)
  where status = 'confirmed';
alter table public.future_appointments enable row level security;
revoke all on table public.future_appointments from public, anon, authenticated;

-- Staff identity is retained for new history. Existing history cannot safely be
-- attributed from a display name, which can change or be shared by two people.
alter table public.history add column staff_id text;
alter table public.staff_tasks add column day date;
update public.staff_tasks t set day = case when w.kind = 'demo' then coalesce(w.day, public.ist_date())
  else (t.created_at at time zone 'Asia/Kolkata')::date end
from public.workspaces w where w.id = t.ws;
alter table public.staff_tasks alter column day set not null;
create index staff_tasks_staff_day on public.staff_tasks(ws, staff_id, day);

create function public.calendar_task_day()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.day is null then
    select case when kind = 'live' then ist_date() else coalesce(day, ist_date()) end
      into new.day from workspaces where id = new.ws;
  end if;
  return new;
end $$;
create trigger staff_tasks_calendar_day before insert on public.staff_tasks
for each row execute function public.calendar_task_day();

-- Editing a shift or removing a skill cannot invalidate an already promised date.
-- Serialize with reservation creation through the staff row lock.
create function public.protect_future_appointments()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from future_appointments a where a.ws = old.ws and a.staff_id = old.id
    and a.status = 'confirmed' and (not new.active or a.start_min < new.shift_start
      or a.start_min + a.minutes > new.shift_end or not (a.skill = any(new.skills)))) then
    raise exception 'HAS_FUTURE_BOOKINGS' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger staff_future_appointments before update of active, skills, shift_start, shift_end on public.staff
for each row execute function public.protect_future_appointments();

create or replace function public.archive_day(p_ws uuid)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform 1 from moves where ws = p_ws order by id for update;
  perform 1 from staff where ws = p_ws order by id for update;
  perform 1 from offers where ws = p_ws order by id for update;
  perform 1 from slots where ws = p_ws order by id for update;
  insert into history (ws, day, start_min, minutes, service, staff_name, staff_id, customer, entry_id, status, price_inr, refilled)
  select s.ws, coalesce(w.day, ist_date() - 1), s.start_min, s.minutes, coalesce(s.service, s.skill), st.name, s.staff_id, s.customer,
    (select b.entry_id from bookings b where b.ws = s.ws and b.slot_id = s.id and b.status = 'confirmed' limit 1),
    case s.status when 'booked' then 'booked' when 'blocked' then 'held' else 'unfilled' end, s.price_inr, s.refilled
  from slots s join workspaces w on w.id = s.ws left join staff st on st.ws = s.ws and st.id = s.staff_id
  where s.ws = p_ws;
  get diagnostics n = row_count;
  delete from moves where ws = p_ws;
  delete from offers where ws = p_ws;
  delete from bookings where ws = p_ws;
  delete from slots where ws = p_ws;
  update staff set present = true where ws = p_ws and active;
  perform log_event(p_ws, 'DAY_CLOSED', null, null, null, null, jsonb_build_object('appointments', n));
  return n;
end $$;

-- The workspace row is the date-boundary lock. Multiple browser polls and cron
-- ticks may enter here, but a reservation is promoted only once in this transaction.
create function public.calendar_sync(p_ws uuid)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; a future_appointments; e waitlist; st staff; d date := ist_date();
  sid text; n int := 0;
begin
  -- NO KEY UPDATE serializes calendar operations while allowing the KEY SHARE
  -- locks acquired by foreign-key checks in existing staff-first desk actions.
  select * into w from workspaces where id = p_ws for no key update;
  if not found or w.kind <> 'live' then return 0; end if;
  if w.day is null or w.day < d then
    n := archive_day(p_ws);
    update workspaces set day = d where id = p_ws;
  end if;
  update workspaces set now_min = ist_minute() where id = p_ws;
  for a in select * from future_appointments where ws = p_ws and day <= d and status = 'confirmed'
           order by day, start_min, id for update loop
    select * into e from waitlist where ws = p_ws and id = a.entry_id;
    select * into st from staff where ws = p_ws and id = a.staff_id for update;
    if a.day < d then
      -- A stopped clock must not turn yesterday's appointment into today's slot.
      insert into history (ws, day, start_min, minutes, service, staff_name, staff_id, customer, entry_id, status, price_inr, refilled)
      values (p_ws, a.day, a.start_min, a.minutes, a.service, st.name, a.staff_id, e.name, a.entry_id, 'booked', a.price_inr, false);
    else
      -- slots_id_fmt permits at most 32 characters.
      sid := replace(a.id::text, '-', '');
      insert into slots (ws, id, start_min, minutes, skill, status, staff_id, customer, service, price_inr)
      values (p_ws, sid, a.start_min, a.minutes, a.skill, 'booked', a.staff_id, e.name, a.service, a.price_inr);
      insert into bookings (ws, slot_id, entry_id, offer_id) values (p_ws, sid, a.entry_id, null);
    end if;
    update future_appointments set status = 'promoted' where id = a.id;
  end loop;
  perform expire_offers(p_ws, ist_minute());
  return n;
end $$;

create or replace function public.tick_live()
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare w record; n int := 0;
begin
  for w in select id from workspaces where kind = 'live' order by id loop
    perform calendar_sync(w.id);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.sync_clock(p_ws uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  if (select kind from workspaces where id = p_ws) <> 'live' then return jsonb_build_object('ok', false, 'code', 'NOT_LIVE'); end if;
  n := calendar_sync(p_ws);
  return jsonb_build_object('ok', true, 'now_min', ist_minute(), 'archived', n);
end $$;

-- Old desk pages also cross the date boundary before reading or adding work.
alter function public.get_state(uuid, text) rename to get_state_before_calendar;
create function public.get_state(p_ws uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform require_desk(p_ws, p_key);
  perform calendar_sync(p_ws);
  return get_state_before_calendar(p_ws, p_key);
end $$;

alter function public.add_appointment(uuid, text, jsonb) rename to add_appointment_today;
create function public.add_appointment(p_ws uuid, p_key text, p_appt jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform require_desk(p_ws, p_key);
  perform calendar_sync(p_ws);
  return add_appointment_today(p_ws, p_key, p_appt);
end $$;

alter function public.join_info(text) rename to join_info_before_calendar;
create function public.join_info(p_code text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select join_info_before_calendar(p_code) || coalesce((select jsonb_build_object(
    'today', case when kind = 'live' then ist_date() else coalesce(day, ist_date()) end,
    'max_day', case when kind = 'live' then ist_date() + 90 else coalesce(day, ist_date()) end,
    'calendar', true) from workspaces where join_code = p_code), '{}');
$$;

alter function public.open_times(text, int, text) rename to open_times_today;
create function public.open_times_on_date(p_code text, p_minutes int, p_skill text, p_day date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; d date; result jsonb;
begin
  select * into w from workspaces where join_code = p_code;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'times', '[]'::jsonb); end if;
  perform calendar_sync(w.id);
  select * into w from workspaces where id = w.id;
  d := case when w.kind = 'live' then ist_date() else coalesce(w.day, ist_date()) end;
  if p_day is null or p_day < d or p_day > d + 90 or (w.kind = 'demo' and p_day <> d) then
    return jsonb_build_object('ok', false, 'code', 'DATE_UNAVAILABLE', 'today', d, 'day', p_day, 'times', '[]'::jsonb);
  end if;
  if p_minutes is null or p_minutes not between 5 and 720 or nullif(trim(p_skill), '') is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE', 'today', d, 'day', p_day, 'times', '[]'::jsonb);
  end if;
  if p_day = d then
    result := open_times_today(p_code, p_minutes, p_skill);
  else
    select jsonb_build_object('ok', true, 'times', coalesce(jsonb_agg(jsonb_build_object(
      'staff', q.id, 'name', q.name, 'start_min', q.start_min, 'slot', null) order by q.start_min, q.name), '[]'))
    into result from (
      select st.id, st.name, t as start_min
      from staff st, generate_series(((st.shift_start + 14) / 15) * 15, st.shift_end - p_minutes, 15) t
      where st.ws = w.id and st.active and p_skill = any(st.skills)
        and not exists (select 1 from future_appointments a where a.ws = w.id and a.staff_id = st.id
          and a.day = p_day and a.status = 'confirmed' and a.start_min < t + p_minutes and a.start_min + a.minutes > t)
    ) q;
  end if;
  return result || jsonb_build_object('day', p_day, 'today', d, 'now_min', w.now_min);
end $$;

create function public.open_times(p_code text, p_minutes int, p_skill text)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select open_times_on_date(p_code, p_minutes, p_skill,
    (select case when kind = 'live' then ist_date() else coalesce(day, ist_date()) end from workspaces where join_code = p_code));
$$;

alter function public.book_time(text, jsonb, text, int) rename to book_time_today;
create function public.book_time_on_date(p_code text, p_entry jsonb, p_staff text, p_start int, p_day date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; st staff; d date; v_min int; v_skill text; v_name text; v_service text; v_price int;
  tok text := new_key(); nid text; npos int; result jsonb;
begin
  perform enforce_rate('calendar-book:' || client_ip(), 30, 600);
  select * into w from workspaces where join_code = p_code for no key update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  perform calendar_sync(w.id);
  select * into w from workspaces where id = w.id;
  d := case when w.kind = 'live' then ist_date() else coalesce(w.day, ist_date()) end;
  if p_day is null or p_day < d or p_day > d + 90 or (w.kind = 'demo' and p_day <> d) then
    return jsonb_build_object('ok', false, 'code', 'DATE_UNAVAILABLE');
  end if;
  if p_day = d then
    result := book_time_today(p_code, p_entry, p_staff, p_start);
    return result || jsonb_build_object('day', d);
  end if;
  v_min := (p_entry ->> 'minutes')::int;
  v_skill := trim(coalesce(p_entry ->> 'skill', ''));
  v_name := trim(coalesce(p_entry ->> 'name', ''));
  v_service := nullif(trim(coalesce(p_entry ->> 'service', '')), '');
  v_price := (p_entry ->> 'price_inr')::int;
  if v_name = '' then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD'); end if;
  if v_min is null or v_min not between 5 and 720 or v_skill = '' or p_start is null or p_start % 15 <> 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
  end if;
  select * into st from staff where ws = w.id and id = p_staff and active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if not (v_skill = any(st.skills)) then return jsonb_build_object('ok', false, 'code', 'WRONG_SKILL'); end if;
  if p_start < st.shift_start or p_start + v_min > st.shift_end then
    return jsonb_build_object('ok', false, 'code', 'TARGET_OFF_SHIFT');
  end if;
  if exists (select 1 from future_appointments a where a.ws = w.id and a.staff_id = st.id
    and a.day = p_day and a.status = 'confirmed' and a.start_min < p_start + v_min and a.start_min + a.minutes > p_start) then
    return jsonb_build_object('ok', false, 'code', 'TAKEN');
  end if;
  if (select count(*) from waitlist where ws = w.id) >= 300
    or (select count(*) from future_appointments where ws = w.id and day = p_day and status = 'confirmed') >= 300 then
    return jsonb_build_object('ok', false, 'code', 'TOO_LARGE');
  end if;
  npos := (select coalesce(max(pos), 0) + 1 from waitlist where ws = w.id);
  nid := 'W' || npos;
  insert into waitlist (ws, id, pos, name, minutes, skill, service, price_inr, token_hash, source, user_id, status)
  values (w.id, nid, npos, v_name, v_min, v_skill, v_service, v_price, hash_key(tok), 'self sign-up', auth.uid(), 'booked');
  insert into future_appointments (ws, entry_id, staff_id, day, start_min, minutes, skill, service, price_inr)
  values (w.id, nid, st.id, p_day, p_start, v_min, v_skill, v_service, v_price);
  perform log_event(w.id, 'FUTURE_BOOKED', null, null, nid, null,
    jsonb_build_object('day', p_day, 'start_min', p_start, 'minutes', v_min, 'staff', st.id));
  return jsonb_build_object('ok', true, 'token', tok, 'day', p_day);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'code', 'TRY_AGAIN');
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- Older pages still book today, but now share the rollover lock.
create function public.book_time(p_code text, p_entry jsonb, p_staff text, p_start int)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select book_time_on_date(p_code, p_entry, p_staff, p_start,
    (select case when kind = 'live' then ist_date() else coalesce(day, ist_date()) end from workspaces where join_code = p_code));
$$;

-- One internal projection feeds both private-token pages and signed-in accounts.
create function public.calendar_booking(p_ws uuid, p_entry text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select jsonb_build_object('status', b.status, 'day', coalesce(w.day, ist_date()),
      'start_min', s.start_min, 'minutes', s.minutes, 'service', s.service, 'stylist', st.name,
      'stylist_present', st.present, 'scheduled', false)
     from bookings b join slots s on s.ws = b.ws and s.id = b.slot_id
       join workspaces w on w.id = b.ws left join staff st on st.ws = s.ws and st.id = s.staff_id
     where b.ws = p_ws and b.entry_id = p_entry order by b.id desc limit 1),
    (select jsonb_build_object('status', a.status, 'day', a.day, 'start_min', a.start_min,
      'minutes', a.minutes, 'service', a.service, 'stylist', st.name, 'stylist_present', null, 'scheduled', true)
     from future_appointments a left join staff st on st.ws = a.ws and st.id = a.staff_id
     where a.ws = p_ws and a.entry_id = p_entry and a.status in ('confirmed', 'cancelled')));
$$;

alter function public.get_my_entry(text) rename to get_my_entry_before_calendar;
create function public.get_my_entry(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist; result jsonb;
begin
  select * into e from waitlist where token_hash = hash_key(p_token);
  if not found then return jsonb_build_object('state', 'NOT_FOUND'); end if;
  perform calendar_sync(e.ws);
  result := get_my_entry_before_calendar(p_token);
  return result || jsonb_build_object('booking', calendar_booking(e.ws, e.id),
    'join_code', (select join_code from workspaces where id = e.ws), 'today', ist_date());
end $$;

alter function public.my_entries() rename to my_entries_before_calendar;
create function public.my_entries()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w record;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  for w in select distinct ws from waitlist where user_id = auth.uid() order by ws loop
    perform calendar_sync(w.ws);
  end loop;
  return (select coalesce(jsonb_agg(e || jsonb_build_object('booking', calendar_booking((e ->> 'ws')::uuid, e ->> 'id'), 'today', ist_date())), '[]')
    from jsonb_array_elements(my_entries_before_calendar()) e);
end $$;

create function public.cancel_scheduled_booking(p_token text default null, p_ws uuid default null, p_entry text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist; a future_appointments;
begin
  perform enforce_rate('book:' || client_ip(), 30, 600);
  if p_token is not null then
    select * into e from waitlist where token_hash = hash_key(p_token);
  elsif auth.uid() is not null then
    select * into e from waitlist where ws = p_ws and id = p_entry and user_id = auth.uid();
  end if;
  if e.id is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  perform calendar_sync(e.ws);
  select * into a from future_appointments where ws = e.ws and entry_id = e.id for update;
  if not found or a.status = 'promoted' then return jsonb_build_object('ok', false, 'code', 'USE_TODAY_BOOKING'); end if;
  if a.status = 'cancelled' then return jsonb_build_object('ok', true); end if;
  update future_appointments set status = 'cancelled' where id = a.id;
  update waitlist set status = 'removed' where ws = e.ws and id = e.id;
  perform log_event(e.ws, 'FUTURE_CANCELLED', null, null, e.id, null, jsonb_build_object('day', a.day));
  return jsonb_build_object('ok', true);
end $$;

create function public.add_task_on_date(p_ws uuid, p_key text, p_staff text, p_text text, p_day date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nid bigint; d date;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select case when kind = 'live' then ist_date() else coalesce(day, ist_date()) end into d from workspaces where id = p_ws;
  if p_day is null or p_day < d or p_day > d + 90 then return jsonb_build_object('ok', false, 'code', 'DATE_UNAVAILABLE'); end if;
  if not exists (select 1 from staff where ws = p_ws and id = p_staff and active) then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if (select count(*) from staff_tasks where ws = p_ws and not done and not missed) >= 500 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
  insert into staff_tasks (ws, staff_id, text, day) values (p_ws, p_staff, trim(p_text), p_day) returning id into nid;
  return jsonb_build_object('ok', true, 'id', nid, 'day', p_day);
exception
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

create function public.get_staff_calendar(p_ws uuid, p_staff text, p_key text, p_day date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; d date; selected date; result jsonb; appointments jsonb;
begin
  perform require_staff(p_ws, p_staff, p_key);
  perform calendar_sync(p_ws);
  select * into w from workspaces where id = p_ws;
  d := case when w.kind = 'live' then ist_date() else coalesce(w.day, ist_date()) end;
  selected := coalesce(p_day, d);
  result := get_staff_day(p_ws, p_staff, p_key);
  if selected = d then
    appointments := result -> 'slots';
  elsif selected > d then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id::text, 'start_min', a.start_min,
      'minutes', a.minutes, 'service', a.service, 'status', 'booked', 'refilled', false,
      'customer', split_part(e.name, ' ', 1)) order by a.start_min), '[]') into appointments
    from future_appointments a join waitlist e on e.ws = a.ws and e.id = a.entry_id
    where a.ws = p_ws and a.staff_id = p_staff and a.day = selected and a.status = 'confirmed';
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', 'H' || h.id, 'start_min', h.start_min,
      'minutes', h.minutes, 'service', h.service,
      'status', case h.status when 'booked' then 'booked' when 'held' then 'blocked' else 'free' end,
      'refilled', h.refilled, 'customer', split_part(coalesce(h.customer, ''), ' ', 1)) order by h.start_min), '[]') into appointments
    from history h where h.ws = p_ws and h.staff_id = p_staff and h.day = selected;
  end if;
  return result || jsonb_build_object('day', selected, 'today', d, 'kind', w.kind, 'slots', appointments,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.text, 'done', t.done,
      'missed', t.missed, 'day', t.day) order by t.done, t.created_at)
      from staff_tasks t where t.ws = p_ws and t.staff_id = p_staff and t.day = selected), '[]'),
    'scheduled_days', coalesce((select jsonb_agg(x.day order by x.day) from (
      select d as day where exists(select 1 from slots where ws = p_ws and staff_id = p_staff)
      union select day from future_appointments where ws = p_ws and staff_id = p_staff and status = 'confirmed'
      union select day from history where ws = p_ws and staff_id = p_staff
      union select day from staff_tasks where ws = p_ws and staff_id = p_staff
    ) x), '[]'));
end $$;

-- Today's absence notices contain today's tasks. A task on another date is not
-- missed just because its assignee is out now. Preserve migration 012 auto-cover.
create or replace function public.set_staff_presence(p_ws uuid, p_staff text, p_key text, p_present boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; w workspaces; n_blocked int := 0; n_freed int := 0; n_revoked int := 0; n_risk int := 0;
  plan jsonb := jsonb_build_object('covered', '[]'::jsonb, 'left', '[]'::jsonb); n_covered int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_staff(p_ws, p_staff, p_key);
  if p_present is null then raise exception 'INVALID_VALUE'; end if;
  perform calendar_sync(p_ws);
  select * into w from workspaces where id = p_ws for no key update;
  select * into st from staff where ws = p_ws and id = p_staff for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if st.present = p_present then return jsonb_build_object('ok', true, 'blocked', 0, 'freed', 0, 'revoked_offers', 0, 'at_risk', 0, 'covered', 0, 'unchanged', true); end if;
  if p_present then
    update slots set status = 'free', blocked_reason = null
    where ws = p_ws and staff_id = p_staff and status = 'blocked' and blocked_reason = 'STAFF_ABSENT';
    get diagnostics n_freed = row_count;
    update staff set present = true where ws = p_ws and id = p_staff;
  else
    perform 1 from offers o where o.ws = p_ws and o.status = 'sent'
      and o.slot_id in (select id from slots where ws = p_ws and staff_id = p_staff) order by o.id for update;
    update offers set status = 'revoked', responded_at = now()
    where ws = p_ws and status = 'sent' and slot_id in (select id from slots where ws = p_ws and staff_id = p_staff);
    get diagnostics n_revoked = row_count;
    update slots set status = 'blocked', blocked_reason = 'STAFF_ABSENT'
    where ws = p_ws and staff_id = p_staff and status = 'free' and start_min + minutes > w.now_min;
    get diagnostics n_blocked = row_count;
    update staff set present = false where ws = p_ws and id = p_staff;
    if w.auto_cover then plan := cover_absence_plan(p_ws, p_staff); end if;
    n_covered := jsonb_array_length(plan -> 'covered');
    select count(*) into n_risk from slots where ws = p_ws and staff_id = p_staff and status = 'booked' and start_min >= w.now_min;
    insert into notices (ws, kind, staff_id, detail) values (p_ws, 'STAFF_ABSENT', p_staff, jsonb_build_object(
      'name', st.name, 'auto_cover', w.auto_cover, 'covered', plan -> 'covered', 'left', plan -> 'left', 'held', n_blocked,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.text) order by t.created_at)
        from staff_tasks t where t.ws = p_ws and t.staff_id = p_staff and not t.done and not t.missed
          and t.day = coalesce(w.day, ist_date())), '[]'),
      'available', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'skills', c.skills,
        'shift_start', c.shift_start, 'shift_end', c.shift_end) order by c.id)
        from staff c where c.ws = p_ws and c.active and c.present and c.id <> p_staff), '[]')));
  end if;
  perform log_event(p_ws, case when p_present then 'STAFF_BACK' else 'STAFF_ABSENT' end, null, null, null, null,
    jsonb_build_object('staff', p_staff, 'name', st.name, 'blocked', n_blocked, 'freed', n_freed, 'revoked_offers', n_revoked,
      'at_risk', n_risk, 'covered', n_covered));
  return jsonb_build_object('ok', true, 'blocked', n_blocked, 'freed', n_freed, 'revoked_offers', n_revoked,
    'at_risk', n_risk, 'covered', n_covered, 'plan', plan);
end $$;

create or replace function public.reassign_task(p_ws uuid, p_key text, p_task bigint, p_to text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t staff_tasks; from_name text; to_s staff; d date;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select * into t from staff_tasks where ws = p_ws and id = p_task for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if t.done then return jsonb_build_object('ok', false, 'code', 'ALREADY_DONE'); end if;
  select name into from_name from staff where ws = p_ws and id = t.staff_id;
  if p_to is null then
    update staff_tasks set missed = true where id = p_task;
    perform log_event(p_ws, 'TASK_MISSED', null, null, null, null, jsonb_build_object('task', t.text, 'staff', from_name));
    return jsonb_build_object('ok', true, 'missed', true);
  end if;
  select * into to_s from staff where ws = p_ws and id = p_to and active;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select case when kind = 'live' then ist_date() else coalesce(day, ist_date()) end into d from workspaces where id = p_ws;
  if t.day = d and not to_s.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  if to_s.id = t.staff_id and not t.missed then return jsonb_build_object('ok', false, 'code', 'SAME_STAFF'); end if;
  update staff_tasks set staff_id = to_s.id, missed = false where id = p_task;
  perform log_event(p_ws, 'TASK_REASSIGNED', null, null, null, null, jsonb_build_object('task', t.text, 'from', from_name, 'to', to_s.name));
  return jsonb_build_object('ok', true, 'to', to_s.name);
end $$;

-- The application may only call guarded endpoints. Internal helpers and renamed
-- legacy functions must not become alternate public entrypoints.
revoke all on function public.calendar_task_day(), public.protect_future_appointments(), public.calendar_sync(uuid),
  public.calendar_booking(uuid, text), public.join_info_before_calendar(text), public.book_time_today(text, jsonb, text, int),
  public.get_my_entry_before_calendar(text), public.my_entries_before_calendar(), public.archive_day(uuid), public.tick_live(),
  public.get_state_before_calendar(uuid, text), public.add_appointment_today(uuid, text, jsonb), public.open_times_today(text, int, text)
from public, anon, authenticated;
revoke all on function public.join_info(text), public.open_times_on_date(text, int, text, date),
  public.book_time_on_date(text, jsonb, text, int, date), public.book_time(text, jsonb, text, int),
  public.get_my_entry(text), public.my_entries(), public.cancel_scheduled_booking(text, uuid, text),
  public.add_task_on_date(uuid, text, text, text, date), public.get_staff_calendar(uuid, text, text, date),
  public.get_state(uuid, text), public.add_appointment(uuid, text, jsonb), public.open_times(text, int, text)
from public;
grant execute on function public.join_info(text), public.open_times_on_date(text, int, text, date),
  public.book_time_on_date(text, jsonb, text, int, date), public.book_time(text, jsonb, text, int),
  public.get_my_entry(text), public.my_entries(), public.cancel_scheduled_booking(text, uuid, text),
  public.add_task_on_date(uuid, text, text, text, date), public.get_staff_calendar(uuid, text, text, date),
  public.get_state(uuid, text), public.add_appointment(uuid, text, jsonb), public.open_times(text, int, text)
to anon, authenticated;

commit;
