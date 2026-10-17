-- 007 (v5): a real product beside the demo.
--
-- A workspace is now either a demo day (kind 'demo', made from the sample salon, deleted after
-- three days, demo clock) or a live business (kind 'live'): made empty by its owner, any kind of
-- service business, kept, and run on the real clock in India time. A live book holds one day;
-- when the date changes, the day is archived into `history` and the book starts empty.
--
-- New for owners: services, staff create / edit / remove, tasks for staff, the day's history.
-- New for the desk: add an appointment or an open time. New for clients: their own history.
-- Additive only: existing signatures are replaced with the same signature, nothing the deployed
-- client calls is dropped. Lock order everywhere: moves, staff, offers, slots, waitlist.

alter table public.workspaces
  add column kind text not null default 'demo' check (kind in ('demo', 'live')),
  add column business_type text check (business_type is null or (char_length(business_type) between 1 and 40 and business_type !~ '[[:cntrl:]]')),
  add column day date;
alter table public.staff add column active boolean not null default true;

create table public.services (
  ws uuid not null references public.workspaces (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,32}$'),
  name text not null check (char_length(name) between 1 and 60 and name !~ '[[:cntrl:]]'),
  minutes int not null check (minutes between 5 and 720),
  skill text not null check (char_length(skill) between 1 and 24 and skill !~ '[[:cntrl:]]'),
  price_inr int check (price_inr between 0 and 1000000),
  primary key (ws, id)
);
create table public.staff_tasks (
  id bigint generated always as identity primary key,
  ws uuid not null references public.workspaces (id) on delete cascade,
  staff_id text not null,
  text text not null check (char_length(text) between 1 and 200 and text !~ '[[:cntrl:]]'),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index staff_tasks_ws on public.staff_tasks (ws);
create table public.history (
  id bigint generated always as identity primary key,
  ws uuid not null references public.workspaces (id) on delete cascade,
  day date not null,
  start_min int not null,
  minutes int not null,
  service text,
  staff_name text,
  customer text,
  entry_id text,
  status text not null check (status in ('booked', 'unfilled', 'held')),
  price_inr int,
  refilled boolean not null default false
);
create index history_ws_day on public.history (ws, day desc);
alter table public.services enable row level security;
alter table public.staff_tasks enable row level security;
alter table public.history enable row level security;
revoke all on table public.services, public.staff_tasks, public.history from anon, authenticated;

-- Retention applies to demo days only. A live business is never deleted by cleanup.
create or replace function public.cleanup()
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from workspaces where kind = 'demo' and created_at < now() - interval '3 days';
  delete from rate_hits where window_start < now() - interval '1 hour';
$$;

-- India time, as the minute of the day and the date.
create function public.ist_minute()
returns int language sql stable set search_path = public, pg_temp as $$
  select (extract(hour from now() at time zone 'Asia/Kolkata') * 60 + extract(minute from now() at time zone 'Asia/Kolkata'))::int;
$$;
create function public.ist_date()
returns date language sql stable set search_path = public, pg_temp as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- A short id that is free in this workspace: prefix plus the next number.
create function public.next_id(p_ws uuid, p_prefix text, p_table text)
returns text language plpgsql stable set search_path = public, pg_temp as $$
declare n int := 1; taken boolean;
begin
  loop
    execute format('select exists (select 1 from public.%I where ws = $1 and id = $2)', p_table) into taken using p_ws, p_prefix || n;
    exit when not taken;
    n := n + 1;
  end loop;
  return p_prefix || n;
end $$;

-- ------------------------------------------------------------------ creating a live business

create function public.create_business(p_biz jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w uuid; k text := new_key(); code text := substr(new_key(), 1, 8); j jsonb; i int := 0;
begin
  perform enforce_rate('create:' || client_ip(), 120, 600);
  perform enforce_rate('create:all', 1500, 600);
  if random() < 0.05 then perform cleanup(); end if;
  if (select count(*) from workspaces) >= 20000 then raise exception 'CAPACITY'; end if;
  if jsonb_typeof(p_biz -> 'staff') is distinct from 'array' or jsonb_array_length(p_biz -> 'staff') not between 1 and 50
     or jsonb_array_length(coalesce(p_biz -> 'services', '[]')) > 60 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
  end if;
  insert into workspaces (salon, business_type, kind, now_min, day, owner_hash, join_code)
  values (trim(p_biz ->> 'name'), nullif(trim(coalesce(p_biz ->> 'type', '')), ''), 'live', ist_minute(), ist_date(), hash_key(k), code)
  returning id into w;
  for j in select * from jsonb_array_elements(p_biz -> 'staff') loop
    i := i + 1;
    insert into staff (ws, id, name, skills, present, shift_start, shift_end)
    values (w, 'ST' || i, trim(j ->> 'name'), array(select jsonb_array_elements_text(coalesce(j -> 'skills', '[]'))), true,
            coalesce((j ->> 'shift_start')::int, 600), coalesce((j ->> 'shift_end')::int, 1200));
  end loop;
  i := 0;
  for j in select * from jsonb_array_elements(coalesce(p_biz -> 'services', '[]')) loop
    i := i + 1;
    insert into services (ws, id, name, minutes, skill, price_inr)
    values (w, 'SV' || i, trim(j ->> 'name'), (j ->> 'minutes')::int, trim(j ->> 'skill'), (j ->> 'price_inr')::int);
  end loop;
  perform log_event(w, 'BUSINESS_CREATED', null, null, null, null,
    jsonb_build_object('staff', jsonb_array_length(p_biz -> 'staff'), 'services', jsonb_array_length(coalesce(p_biz -> 'services', '[]'))));
  return jsonb_build_object('ok', true, 'id', w, 'owner_key', k, 'join_code', code);
exception
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation or unique_violation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- ------------------------------------------------------------------ the live clock and the day's history

-- Moves the whole book into history and empties it. Waiting clients stay on the waitlist.
create function public.archive_day(p_ws uuid)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform 1 from moves where ws = p_ws order by id for update;
  perform 1 from staff where ws = p_ws order by id for update;
  perform 1 from offers where ws = p_ws order by id for update;
  perform 1 from slots where ws = p_ws order by id for update;
  insert into history (ws, day, start_min, minutes, service, staff_name, customer, entry_id, status, price_inr, refilled)
  select s.ws, coalesce(w.day, ist_date() - 1), s.start_min, s.minutes, coalesce(s.service, s.skill), st.name, s.customer,
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

-- Called by the desk about once a minute: sets a live book to the real time, closes a past day.
create function public.sync_clock(p_ws uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces; m int := ist_minute(); d date := ist_date(); archived int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  select * into w from workspaces where id = p_ws;
  if w.kind <> 'live' then return jsonb_build_object('ok', false, 'code', 'NOT_LIVE'); end if;
  if w.day is null or w.day < d then
    archived := archive_day(p_ws);
    update workspaces set day = d where id = p_ws;
  end if;
  update workspaces set now_min = m where id = p_ws;
  perform expire_offers(p_ws, m);
  return jsonb_build_object('ok', true, 'now_min', m, 'archived', archived);
end $$;

-- The demo clock stays a demo tool: a live book always runs on the real time.
create or replace function public.set_clock(p_ws uuid, p_key text, p_now int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  if (select kind from workspaces where id = p_ws) = 'live' then raise exception 'LIVE_CLOCK'; end if;
  if p_now is null or p_now < 0 or p_now > 1439 then raise exception 'INVALID_VALUE'; end if;
  update workspaces set now_min = p_now where id = p_ws;
  perform expire_offers(p_ws, p_now);
  return true;
end $$;

-- Resetting replaces everything with the sample day, so it is refused for a live business.
create or replace function public.reset_workspace(p_ws uuid, p_key text, p_day jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('reset:' || p_ws, 30, 600);
  perform require_owner(p_ws, p_key);
  perform 1 from workspaces where id = p_ws for update;
  if (select kind from workspaces where id = p_ws) = 'live' then raise exception 'NOT_DEMO'; end if;
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

create function public.get_history(p_ws uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_owner(p_ws, p_key);
  return coalesce((select jsonb_agg(to_jsonb(h) - 'ws' order by h.day desc, h.start_min, h.id)
                   from (select * from history where ws = p_ws order by day desc, start_min limit 2000) h), '[]');
end $$;

-- ------------------------------------------------------------------ owner: staff, services, tasks

-- New staff member (no id) or changes to one (with id). A shift cannot shrink past their bookings.
create function public.save_staff(p_ws uuid, p_key text, p_staff jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare sid text := nullif(p_staff ->> 'id', ''); st staff; v_now int; ss int; se int; outside int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select now_min into v_now from workspaces where id = p_ws;
  ss := coalesce((p_staff ->> 'shift_start')::int, 600);
  se := coalesce((p_staff ->> 'shift_end')::int, 1200);
  if sid is null then
    if (select count(*) from staff where ws = p_ws and active) >= 50 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
    sid := next_id(p_ws, 'ST', 'staff');
    insert into staff (ws, id, name, skills, present, shift_start, shift_end)
    values (p_ws, sid, trim(p_staff ->> 'name'), array(select jsonb_array_elements_text(coalesce(p_staff -> 'skills', '[]'))), true, ss, se);
    perform log_event(p_ws, 'STAFF_ADDED', null, null, null, null, jsonb_build_object('staff', sid, 'name', trim(p_staff ->> 'name')));
    return jsonb_build_object('ok', true, 'id', sid);
  end if;
  select * into st from staff where ws = p_ws and id = sid and active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select count(*) into outside from slots where ws = p_ws and staff_id = sid and status = 'booked'
    and start_min + minutes > v_now and (start_min < ss or start_min + minutes > se);
  if outside > 0 then return jsonb_build_object('ok', false, 'code', 'OUTSIDE_SHIFT', 'count', outside); end if;
  update staff set name = trim(coalesce(p_staff ->> 'name', name)),
    skills = case when p_staff ? 'skills' then array(select jsonb_array_elements_text(p_staff -> 'skills')) else skills end,
    shift_start = ss, shift_end = se
  where ws = p_ws and id = sid;
  perform log_event(p_ws, 'STAFF_CHANGED', null, null, null, null, jsonb_build_object('staff', sid, 'name', trim(coalesce(p_staff ->> 'name', st.name))));
  return jsonb_build_object('ok', true, 'id', sid);
exception
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- Removing someone with clients still ahead is refused: move or cancel those first.
-- Otherwise their open offers are withdrawn, their open times removed and their link stops working.
create function public.remove_staff(p_ws uuid, p_key text, p_staff text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; v_now int; ahead int; n_revoked int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  select * into st from staff where ws = p_ws and id = p_staff and active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select now_min into v_now from workspaces where id = p_ws;
  select count(*) into ahead from slots where ws = p_ws and staff_id = p_staff and status = 'booked' and start_min + minutes > v_now;
  if ahead > 0 then return jsonb_build_object('ok', false, 'code', 'HAS_BOOKINGS', 'count', ahead); end if;
  perform 1 from offers where ws = p_ws and status = 'sent' and slot_id in (select id from slots where ws = p_ws and staff_id = p_staff) order by id for update;
  update offers set status = 'revoked', responded_at = now()
  where ws = p_ws and status = 'sent' and slot_id in (select id from slots where ws = p_ws and staff_id = p_staff);
  get diagnostics n_revoked = row_count;
  delete from slots where ws = p_ws and staff_id = p_staff and status <> 'booked' and start_min + minutes > v_now;
  update staff set active = false, present = false, key_hash = null where ws = p_ws and id = p_staff;
  delete from staff_tasks where ws = p_ws and staff_id = p_staff and not done;
  perform log_event(p_ws, 'STAFF_REMOVED', null, null, null, null, jsonb_build_object('staff', p_staff, 'name', st.name, 'revoked_offers', n_revoked));
  return jsonb_build_object('ok', true, 'revoked_offers', n_revoked);
end $$;

create function public.save_service(p_ws uuid, p_key text, p_service jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare sid text := nullif(p_service ->> 'id', '');
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  if sid is null then
    if (select count(*) from services where ws = p_ws) >= 60 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
    sid := next_id(p_ws, 'SV', 'services');
  end if;
  insert into services (ws, id, name, minutes, skill, price_inr)
  values (p_ws, sid, trim(p_service ->> 'name'), (p_service ->> 'minutes')::int, trim(p_service ->> 'skill'), (p_service ->> 'price_inr')::int)
  on conflict (ws, id) do update set name = excluded.name, minutes = excluded.minutes, skill = excluded.skill, price_inr = excluded.price_inr;
  perform log_event(p_ws, 'SERVICE_SAVED', null, null, null, null, jsonb_build_object('service', sid, 'name', trim(p_service ->> 'name')));
  return jsonb_build_object('ok', true, 'id', sid);
exception
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

create function public.remove_service(p_ws uuid, p_key text, p_service text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  delete from services where ws = p_ws and id = p_service;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  perform log_event(p_ws, 'SERVICE_REMOVED', null, null, null, null, jsonb_build_object('service', p_service));
  return jsonb_build_object('ok', true);
end $$;

create function public.add_task(p_ws uuid, p_key text, p_staff text, p_text text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nid bigint;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  if not exists (select 1 from staff where ws = p_ws and id = p_staff and active) then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if (select count(*) from staff_tasks where ws = p_ws and not done) >= 500 then return jsonb_build_object('ok', false, 'code', 'TOO_LARGE'); end if;
  insert into staff_tasks (ws, staff_id, text) values (p_ws, p_staff, trim(p_text)) returning id into nid;
  return jsonb_build_object('ok', true, 'id', nid);
exception
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- The owner, the front desk or the staff member it belongs to can tick a task off.
create function public.set_task(p_ws uuid, p_key text, p_task bigint, p_done boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t staff_tasks;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  select * into t from staff_tasks where ws = p_ws and id = p_task for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  perform require_staff(p_ws, t.staff_id, p_key);
  update staff_tasks set done = coalesce(p_done, false), done_at = case when p_done then now() end where id = p_task;
  return jsonb_build_object('ok', true);
end $$;

create function public.remove_task(p_ws uuid, p_key text, p_task bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  delete from staff_tasks where ws = p_ws and id = p_task;
  return jsonb_build_object('ok', found);
end $$;

-- ------------------------------------------------------------------ desk: a new appointment or open time

-- With a client name it is booked; without one it is open time the waitlist can be offered.
-- The staff member's row is locked first, so two adds onto the same person cannot overlap.
create function public.add_appointment(p_ws uuid, p_key text, p_appt jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; v_now int; s_start int := (p_appt ->> 'start_min')::int; s_min int := (p_appt ->> 'minutes')::int;
        who text := nullif(trim(coalesce(p_appt ->> 'customer', '')), ''); nid text;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
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
  insert into slots (ws, id, start_min, minutes, skill, status, staff_id, customer, service, price_inr)
  values (p_ws, nid, s_start, s_min, coalesce(nullif(trim(p_appt ->> 'skill'), ''), st.skills[1], 'general'),
          case when who is null then 'free' else 'booked' end, st.id, who, nullif(trim(coalesce(p_appt ->> 'service', '')), ''), (p_appt ->> 'price_inr')::int);
  perform log_event(p_ws, case when who is null then 'OPEN_TIME_ADDED' else 'APPOINTMENT_ADDED' end, null, nid, null, null,
    jsonb_build_object('staff', st.id, 'name', st.name, 'start_min', s_start, 'minutes', s_min, 'customer', who));
  return jsonb_build_object('ok', true, 'id', nid);
exception
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

-- ------------------------------------------------------------------ reads, same signatures plus the new parts

create or replace function public.get_state(p_ws uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_desk(p_ws, p_key);
  return (select jsonb_build_object(
    'role', role_of(p_ws, p_key),
    'workspace', to_jsonb(w) - 'owner_hash' - 'desk_hash',
    'staff', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' - 'key_hash' order by s.id) from staff s where s.ws = p_ws and s.active), '[]'),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' order by s.start_min, s.staff_id, s.id) from slots s where s.ws = p_ws), '[]'),
    'waitlist', coalesce((select jsonb_agg(to_jsonb(e) - 'ws' - 'token_hash' order by e.pos) from waitlist e where e.ws = p_ws), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) - 'ws' order by o.created_at) from offers o where o.ws = p_ws), '[]'),
    'bookings', coalesce((select jsonb_agg(to_jsonb(b) - 'ws' order by b.id) from bookings b where b.ws = p_ws), '[]'),
    'moves', coalesce((select jsonb_agg(to_jsonb(m) - 'ws' order by m.created_at) from moves m where m.ws = p_ws), '[]'),
    'services', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id) from services v where v.ws = p_ws), '[]'),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) - 'ws' order by t.done, t.created_at) from staff_tasks t where t.ws = p_ws), '[]'),
    'events', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id desc)
                        from (select * from events where ws = p_ws order by id desc limit 300) v), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

create or replace function public.get_staff_day(p_ws uuid, p_staff text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform require_staff(p_ws, p_staff, p_key);
  return (select jsonb_build_object(
    'salon', w.salon, 'now_min', w.now_min,
    'staff', (select jsonb_build_object('id', st.id, 'name', st.name, 'skills', st.skills, 'present', st.present) from staff st where st.ws = p_ws and st.id = p_staff),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'start_min', s.start_min, 'minutes', s.minutes, 'service', s.service,
                         'status', s.status, 'refilled', s.refilled, 'blocked_reason', s.blocked_reason,
                         'customer', split_part(coalesce(s.customer, ''), ' ', 1)) order by s.start_min)
                       from slots s where s.ws = p_ws and s.staff_id = p_staff), '[]'),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.text, 'done', t.done) order by t.done, t.created_at)
                       from staff_tasks t where t.ws = p_ws and t.staff_id = p_staff), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

-- The sign-up lists the business's own services when it has them; a demo day has none and uses the sample list.
create or replace function public.join_info(p_code text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when w.id is null then jsonb_build_object('ok', false)
    else jsonb_build_object('ok', true, 'salon', w.salon, 'max_offers', w.max_offers, 'kind', w.kind,
      'services', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'minutes', v.minutes, 'skill', v.skill, 'price_inr', v.price_inr) order by v.id)
                            from services v where v.ws = w.id), '[]')) end
  from (select 1) one left join workspaces w on w.join_code = p_code;
$$;

-- The client's own page, plus their past appointments at this place.
create or replace function public.get_my_entry(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when e.id is null then jsonb_build_object('state', 'NOT_FOUND') else jsonb_build_object(
    'state', e.status, 'name', e.name, 'service', e.service, 'minutes', e.minutes, 'price_inr', e.price_inr,
    'consent', e.consent, 'consent_at', e.consent_at, 'consent_source', e.consent_source,
    'free_from', e.free_from, 'free_until', e.free_until, 'salon', w.salon, 'now_min', w.now_min, 'kind', w.kind,
    'place', (select count(*) from waitlist x where x.ws = e.ws and x.status = 'waiting' and x.pos <= e.pos),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'start_min', s.start_min, 'minutes', s.minutes,
                          'expires_min', o.expires_min, 'status', o.status, 'slot_status', s.status) order by o.created_at desc)
                        from offers o join slots s on s.ws = o.ws and s.id = o.slot_id
                        where o.ws = e.ws and o.entry_id = e.id), '[]'),
    'booking', (select jsonb_build_object('status', b.status, 'start_min', s.start_min, 'minutes', s.minutes,
                         'service', s.service, 'stylist', t.name, 'stylist_present', t.present)
                from bookings b join slots s on s.ws = b.ws and s.id = b.slot_id
                left join staff t on t.ws = s.ws and t.id = s.staff_id
                where b.ws = e.ws and b.entry_id = e.id order by b.id desc limit 1),
    'history', coalesce((select jsonb_agg(jsonb_build_object('day', h.day, 'start_min', h.start_min, 'minutes', h.minutes,
                           'service', h.service, 'staff', h.staff_name) order by h.day desc, h.start_min)
                         from history h where h.ws = e.ws and h.entry_id = e.id and h.status = 'booked'), '[]')
  ) end
  from (select 1) one
  left join waitlist e on e.token_hash = hash_key(p_token)
  left join workspaces w on w.id = e.ws;
$$;

revoke all on function public.ist_minute(), public.ist_date(), public.next_id(uuid, text, text), public.archive_day(uuid)
  from public, anon, authenticated;
grant execute on function
  public.create_business(jsonb), public.sync_clock(uuid, text), public.get_history(uuid, text),
  public.save_staff(uuid, text, jsonb), public.remove_staff(uuid, text, text),
  public.save_service(uuid, text, jsonb), public.remove_service(uuid, text, text),
  public.add_task(uuid, text, text, text), public.set_task(uuid, text, bigint, boolean), public.remove_task(uuid, text, bigint),
  public.add_appointment(uuid, text, jsonb)
to anon, authenticated;
