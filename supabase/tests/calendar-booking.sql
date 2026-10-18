-- LOCAL TEST DRAFT, NOT EXECUTED.
-- For an approved disposable PostgreSQL/Supabase database with migrations 001-012
-- and ../calendar-booking.sql applied. Never run against the shared live service.
-- This script creates only synthetic fixtures and rolls everything back.
begin;

create function pg_temp.calendar_assert(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'Calendar test failed: %', p_message; end if;
end $$;

do $$
declare made jsonb; w uuid; owner_key text; code text; staff_key text; actor uuid := gen_random_uuid();
  d date := public.ist_date(); r jsonb; booked jsonb; other_day jsonb; adjacent jsonb; day_view jsonb;
  v_entry text; account_entries jsonb; invalid_key_rejected boolean := false; shift_guard_rejected boolean := false;
  payload jsonb := '{"name":"Synthetic Client","service":"Haircut","minutes":30,"skill":"hair","price_inr":500}'::jsonb;
begin
  insert into auth.users(id, email) values (actor, 'calendar-' || actor || '@example.test');
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);

  made := public.create_workspace('{
    "salon":"Synthetic calendar test","now_min":600,
    "staff":[{"id":"ST1","name":"Synthetic Stylist","skills":["hair"],"present":true,"shift_start":540,"shift_end":1080},
             {"id":"ST2","name":"Other Stylist","skills":["hair"],"present":true,"shift_start":540,"shift_end":1080}],
    "slots":[],"waitlist":[],"tasks":[]}'::jsonb);
  w := (made ->> 'id')::uuid;
  owner_key := made ->> 'owner_key';
  code := made ->> 'join_code';
  update public.workspaces set kind = 'live', day = d where id = w;
  staff_key := public.staff_link(w, owner_key, 'ST1');

  r := public.join_info(code);
  perform pg_temp.calendar_assert((r ->> 'today')::date = d and (r ->> 'max_day')::date = d + 90, 'India date and booking horizon');
  r := public.open_times_on_date(code, 30, 'hair', d + 1);
  perform pg_temp.calendar_assert((r ->> 'ok')::boolean and jsonb_array_length(r -> 'times') > 0, 'tomorrow has available shifts');
  r := public.open_times_on_date(code, 30, 'hair', d - 1);
  perform pg_temp.calendar_assert(r ->> 'code' = 'DATE_UNAVAILABLE', 'past booking dates are rejected');
  r := public.open_times_on_date(code, 30, 'hair', d + 91);
  perform pg_temp.calendar_assert(r ->> 'code' = 'DATE_UNAVAILABLE', 'booking horizon is enforced on server');
  r := public.book_time_on_date(code, payload, 'ST1', 600, null);
  perform pg_temp.calendar_assert(r ->> 'code' = 'DATE_UNAVAILABLE', 'a date is required');

  -- The same staff/time on different dates is independent. Overlapping intervals
  -- on one date are refused, while a back-to-back appointment remains available.
  booked := public.book_time_on_date(code, payload, 'ST1', 600, d + 1);
  perform pg_temp.calendar_assert((booked ->> 'ok')::boolean, 'first future reservation succeeds');
  r := public.book_time_on_date(code, payload, 'ST1', 615, d + 1);
  perform pg_temp.calendar_assert(r ->> 'code' = 'TAKEN', 'overlapping appointment is refused');
  r := public.book_time_on_date(code, payload, 'ST1', 600, d + 1);
  perform pg_temp.calendar_assert(r ->> 'code' = 'TAKEN', 'duplicate appointment is refused');
  other_day := public.book_time_on_date(code, payload, 'ST1', 600, d + 2);
  perform pg_temp.calendar_assert((other_day ->> 'ok')::boolean, 'same time on another date succeeds');
  adjacent := public.book_time_on_date(code, payload, 'ST1', 630, d + 1);
  perform pg_temp.calendar_assert((adjacent ->> 'ok')::boolean, 'back-to-back appointments succeed');
  r := public.book_time_on_date(code, payload, 'ST1', 1065, d + 1);
  perform pg_temp.calendar_assert(r ->> 'code' = 'TARGET_OFF_SHIFT', 'whole service must fit shift');
  r := public.book_time_on_date(code, payload || '{"skill":"nails"}', 'ST1', 720, d + 1);
  perform pg_temp.calendar_assert(r ->> 'code' = 'WRONG_SKILL', 'staff skill checked at booking');
  r := public.open_times_on_date(code, 30, 'hair', d + 1);
  perform pg_temp.calendar_assert(not exists(select 1 from jsonb_array_elements(r -> 'times') t
    where t ->> 'staff' = 'ST1' and (t ->> 'start_min')::int between 585 and 645), 'availability excludes all overlapping starts');

  -- Today's absence does not imply absence tomorrow.
  perform public.set_staff_presence(w, 'ST1', owner_key, false);
  r := public.book_time_on_date(code, payload, 'ST1', 720, d + 1);
  perform pg_temp.calendar_assert((r ->> 'ok')::boolean, 'today absence does not block tomorrow');
  perform public.cancel_scheduled_booking(p_token => r ->> 'token');
  begin
    update public.staff set shift_end = 600 where ws = w and id = 'ST1';
  exception when check_violation then shift_guard_rejected := true;
  end;
  perform pg_temp.calendar_assert(shift_guard_rejected, 'staff edits cannot invalidate promised future appointments');

  -- Tokens and signed-in accounts see the reserved date, with no false absence.
  r := public.get_my_entry(booked ->> 'token');
  perform pg_temp.calendar_assert((r #>> '{booking,day}')::date = d + 1
    and (r #>> '{booking,scheduled}')::boolean and r #> '{booking,stylist_present}' = 'null'::jsonb,
    'private confirmation contains correct date and future status');
  account_entries := public.my_entries();
  perform pg_temp.calendar_assert(exists(select 1 from jsonb_array_elements(account_entries) e
    where e ->> 'ws' = w::text and (e #>> '{booking,day}')::date = d + 1), 'future booking appears on account');

  day_view := public.get_staff_calendar(w, 'ST1', staff_key, d + 1);
  perform pg_temp.calendar_assert(jsonb_array_length(day_view -> 'slots') = 2, 'staff calendar is filtered to date');
  perform pg_temp.calendar_assert(day_view #>> '{slots,0,customer}' = 'Synthetic', 'staff sees customer first name only');
  day_view := public.get_staff_calendar(w, 'ST2', owner_key, d + 1);
  perform pg_temp.calendar_assert(jsonb_array_length(day_view -> 'slots') = 0, 'one staff calendar excludes others appointments');
  begin
    perform public.get_staff_calendar(w, 'ST2', staff_key, d + 1);
  exception when others then invalid_key_rejected := sqlerrm = 'FORBIDDEN';
  end;
  perform pg_temp.calendar_assert(invalid_key_rejected, 'staff key cannot read another staff calendar');

  perform public.add_task_on_date(w, owner_key, 'ST1', 'Synthetic task tomorrow', d + 1);
  perform public.add_task_on_date(w, owner_key, 'ST1', 'Synthetic task later', d + 2);
  day_view := public.get_staff_calendar(w, 'ST1', staff_key, d + 1);
  perform pg_temp.calendar_assert(jsonb_array_length(day_view -> 'tasks') = 1
    and day_view #>> '{tasks,0,text}' = 'Synthetic task tomorrow', 'tasks are filtered to assigned date');

  -- Cancellation releases only its own reservation and token/account authority
  -- is required. Repeating cancellation is harmless.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  perform set_config('request.jwt.claims', '{}', true);
  select id into v_entry from public.waitlist where ws = w and token_hash = public.hash_key(booked ->> 'token');
  r := public.cancel_scheduled_booking(p_ws => w, p_entry => v_entry);
  perform pg_temp.calendar_assert(r ->> 'code' = 'NOT_FOUND', 'another account cannot cancel a reservation');
  r := public.cancel_scheduled_booking(p_token => booked ->> 'token');
  perform pg_temp.calendar_assert((r ->> 'ok')::boolean, 'valid private token can cancel');
  r := public.cancel_scheduled_booking(p_token => booked ->> 'token');
  perform pg_temp.calendar_assert((r ->> 'ok')::boolean, 'repeat cancellation is harmless');
  r := public.get_my_entry(booked ->> 'token');
  perform pg_temp.calendar_assert(r ->> 'state' = 'removed' and r #>> '{booking,status}' = 'cancelled', 'cancellation is visible to client');
  r := public.open_times_on_date(code, 30, 'hair', d + 1);
  perform pg_temp.calendar_assert(exists(select 1 from jsonb_array_elements(r -> 'times') t
    where t ->> 'staff' = 'ST1' and (t ->> 'start_min')::int = 600), 'cancelled date/time becomes bookable again');

  -- Simulate a due date without changing the real clock. Promotion has a stable
  -- 32-character slot id and a second sync cannot insert a second booking.
  select id into v_entry from public.waitlist where ws = w and token_hash = public.hash_key(adjacent ->> 'token');
  update public.future_appointments a set day = d where a.ws = w and a.entry_id = v_entry;
  perform public.calendar_sync(w);
  perform public.calendar_sync(w);
  perform pg_temp.calendar_assert((select count(*) = 1 from public.bookings b where b.ws = w and b.entry_id = v_entry), 'promotion is idempotent');
  r := public.get_my_entry(adjacent ->> 'token');
  perform pg_temp.calendar_assert((r #>> '{booking,day}')::date = d and not (r #>> '{booking,scheduled}')::boolean, 'due reservation joins existing today booking flow');

  -- A missed cron day archives the original date instead of booking it today.
  select id into v_entry from public.waitlist where ws = w and token_hash = public.hash_key(other_day ->> 'token');
  update public.future_appointments a set day = d - 1 where a.ws = w and a.entry_id = v_entry;
  perform public.calendar_sync(w);
  perform public.calendar_sync(w);
  perform pg_temp.calendar_assert((select count(*) = 1 from public.history h where h.ws = w and h.entry_id = v_entry and h.day = d - 1), 'skipped-day archive retains original date once');
  perform pg_temp.calendar_assert((select count(*) = 0 from public.bookings b where b.ws = w and b.entry_id = v_entry), 'skipped-day appointment is not promoted into today');

  perform pg_temp.calendar_assert(not has_function_privilege('anon', 'public.calendar_sync(uuid)', 'EXECUTE'), 'internal rollover helper is private');
  perform pg_temp.calendar_assert(not has_function_privilege('anon', 'public.calendar_booking(uuid,text)', 'EXECUTE'), 'unguarded client projection is private');
  perform pg_temp.calendar_assert(not has_table_privilege('anon', 'public.future_appointments', 'SELECT'), 'future reservations have no direct public read');
  raise notice 'Calendar SQL scenarios passed; rolling back synthetic fixtures.';
end $$;

rollback;

-- Concurrency acceptance test for the later disposable-DB verification:
-- Run book_time_on_date from two separate sessions for the same staff/date/time.
-- Exactly one returns ok=true; the other returns TAKEN. Repeat across two dates:
-- both should succeed. The workspace/staff row locks must remain in both paths.
