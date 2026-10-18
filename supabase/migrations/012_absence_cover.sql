-- 012: when someone is out, the owner hears about it, the day covers itself where it can,
-- and the absent person's tasks can be handed to someone else or marked missed.
--
-- 1. Auto-cover. A planner moves each of the absent person's coming appointments to a teammate
--    who is in, does that service, is on shift for the whole appointment and has nothing else
--    booked or held at that time. Among those, the one with the lightest day takes it (ties go
--    to the earlier staff id), so cover spreads across the team instead of piling on one person.
--    Appointments nobody can take stay flagged for the desk, as before. The owner can switch
--    auto-cover off in Rules; then nothing moves on its own.
-- 2. Notices. Marking someone out (by the desk, the owner or the person themselves) leaves the
--    owner a notice: what was covered and by whom, what still needs moving, the person's open
--    tasks, and who is in to take them.
-- 3. Tasks. The owner gives an absent person's task to someone else, or marks it missed.

alter table public.workspaces add column auto_cover boolean not null default true;
alter table public.staff_tasks add column missed boolean not null default false;

create table public.notices (
  id bigint generated always as identity primary key,
  ws uuid not null references public.workspaces (id) on delete cascade,
  kind text not null check (kind in ('STAFF_ABSENT')),
  staff_id text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notices_ws on public.notices (ws, id desc);
alter table public.notices enable row level security;
revoke all on table public.notices from anon, authenticated;

-- ------------------------------------------------------------------ the planner (internal)

create function public.cover_absence_plan(p_ws uuid, p_staff text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; t staff; v_now int; from_name text; covered jsonb := '[]'; left_over jsonb := '[]';
begin
  select now_min into v_now from workspaces where id = p_ws;
  select name into from_name from staff where ws = p_ws and id = p_staff;
  for s in select * from slots where ws = p_ws and staff_id = p_staff and status = 'booked' and start_min >= v_now
           order by start_min, id for update
  loop
    select c.* into t from staff c
    where c.ws = p_ws and c.active and c.present and c.id <> p_staff
      and s.skill = any (c.skills)
      and s.start_min >= c.shift_start and s.start_min + s.minutes <= c.shift_end
      and not exists (select 1 from slots x where x.ws = p_ws and x.staff_id = c.id
                      and x.start_min < s.start_min + s.minutes and x.start_min + x.minutes > s.start_min)
    order by (select coalesce(sum(b.minutes), 0) from slots b where b.ws = p_ws and b.staff_id = c.id and b.status = 'booked'), c.id
    limit 1
    for update of c;
    if found then
      update slots set staff_id = t.id where ws = p_ws and id = s.id;
      perform log_event(p_ws, 'AUTO_COVERED', null, s.id, null, null,
        jsonb_build_object('from', from_name, 'to', t.name, 'customer', s.customer, 'service', s.service, 'start_min', s.start_min));
      covered := covered || jsonb_build_object('slot', s.id, 'customer', s.customer, 'service', s.service,
        'start_min', s.start_min, 'minutes', s.minutes, 'to', t.id, 'to_name', t.name);
    else
      left_over := left_over || jsonb_build_object('slot', s.id, 'customer', s.customer, 'service', s.service,
        'start_min', s.start_min, 'minutes', s.minutes);
    end if;
  end loop;
  return jsonb_build_object('covered', covered, 'left', left_over);
end $$;

-- ------------------------------------------------------------------ presence, with cover and a notice

create or replace function public.set_staff_presence(p_ws uuid, p_staff text, p_key text, p_present boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; w workspaces; n_blocked int := 0; n_freed int := 0; n_revoked int := 0; n_risk int := 0;
  plan jsonb := jsonb_build_object('covered', '[]'::jsonb, 'left', '[]'::jsonb); n_covered int := 0;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_staff(p_ws, p_staff, p_key);
  if p_present is null then raise exception 'INVALID_VALUE'; end if;
  select * into w from workspaces where id = p_ws for update;
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
                         from staff_tasks t where t.ws = p_ws and t.staff_id = p_staff and not t.done and not t.missed), '[]'),
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

-- The desk or owner runs the planner again (after someone comes back in, or with auto-cover off).
create function public.cover_absence(p_ws uuid, p_key text, p_staff text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st staff; plan jsonb;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_desk(p_ws, p_key);
  perform 1 from workspaces where id = p_ws for update;
  select * into st from staff where ws = p_ws and id = p_staff;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if st.present then return jsonb_build_object('ok', false, 'code', 'NOT_ABSENT'); end if;
  plan := cover_absence_plan(p_ws, p_staff);
  return jsonb_build_object('ok', true, 'covered', jsonb_array_length(plan -> 'covered'), 'left', jsonb_array_length(plan -> 'left'), 'plan', plan);
end $$;

-- ------------------------------------------------------------------ tasks and notices

-- Give a task to someone who is in, or (p_to null) mark it missed. Owner only.
create function public.reassign_task(p_ws uuid, p_key text, p_task bigint, p_to text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t staff_tasks; from_name text; to_s staff;
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
  if not to_s.present then return jsonb_build_object('ok', false, 'code', 'TARGET_ABSENT'); end if;
  if to_s.id = t.staff_id and not t.missed then return jsonb_build_object('ok', false, 'code', 'SAME_STAFF'); end if;
  update staff_tasks set staff_id = to_s.id, missed = false where id = p_task;
  perform log_event(p_ws, 'TASK_REASSIGNED', null, null, null, null, jsonb_build_object('task', t.text, 'from', from_name, 'to', to_s.name));
  return jsonb_build_object('ok', true, 'to', to_s.name);
end $$;

create function public.read_notice(p_ws uuid, p_key text, p_notice bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  update notices set read_at = coalesce(read_at, now()) where ws = p_ws and (p_notice is null or id = p_notice);
  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------------ rules, reads, reset

create or replace function public.set_policy(p_ws uuid, p_key text, p_policy jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w workspaces;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  update workspaces set
    hold_min = coalesce((p_policy ->> 'hold_min')::int, hold_min),
    max_offers = coalesce((p_policy ->> 'max_offers')::int, max_offers),
    late_cutoff_min = coalesce((p_policy ->> 'late_cutoff_min')::int, late_cutoff_min),
    min_lead_min = coalesce((p_policy ->> 'min_lead_min')::int, min_lead_min),
    auto_cover = coalesce((p_policy ->> 'auto_cover')::boolean, auto_cover)
  where id = p_ws returning * into w;
  perform log_event(p_ws, 'POLICY_CHANGED', null, null, null, null, jsonb_build_object(
    'hold_min', w.hold_min, 'max_offers', w.max_offers, 'late_cutoff_min', w.late_cutoff_min, 'min_lead_min', w.min_lead_min,
    'auto_cover', w.auto_cover));
  return jsonb_build_object('ok', true);
exception
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

create or replace function public.get_state(p_ws uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r text;
begin
  perform require_desk(p_ws, p_key);
  r := role_of(p_ws, p_key);
  return (select jsonb_build_object(
    'role', r,
    'workspace', to_jsonb(w) - 'owner_hash' - 'desk_hash',
    'staff', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' - 'key_hash' order by s.id) from staff s where s.ws = p_ws and s.active), '[]'),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'ws' order by s.start_min, s.staff_id, s.id) from slots s where s.ws = p_ws), '[]'),
    'waitlist', coalesce((select jsonb_agg(to_jsonb(e) - 'ws' - 'token_hash' order by e.pos) from waitlist e where e.ws = p_ws), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) - 'ws' order by o.created_at) from offers o where o.ws = p_ws), '[]'),
    'bookings', coalesce((select jsonb_agg(to_jsonb(b) - 'ws' order by b.id) from bookings b where b.ws = p_ws), '[]'),
    'moves', coalesce((select jsonb_agg(to_jsonb(m) - 'ws' order by m.created_at) from moves m where m.ws = p_ws), '[]'),
    'services', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id) from services v where v.ws = p_ws), '[]'),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) - 'ws' order by t.done, t.created_at) from staff_tasks t where t.ws = p_ws), '[]'),
    'notices', case when r = 'owner' then coalesce((select jsonb_agg(to_jsonb(n) - 'ws' order by n.id desc)
                        from (select * from notices where ws = p_ws order by id desc limit 20) n), '[]') else '[]'::jsonb end,
    'events', coalesce((select jsonb_agg(to_jsonb(v) - 'ws' order by v.id desc)
                        from (select * from events where ws = p_ws order by id desc limit 300) v), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

-- A staff member's own day hides tasks the owner marked missed.
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
                       from staff_tasks t where t.ws = p_ws and t.staff_id = p_staff and not t.missed), '[]'))
    from workspaces w where w.id = p_ws);
end $$;

-- The demo day can carry its own tasks; a reset clears tasks and notices with the rest.
create or replace function public.load_day(p_ws uuid, p_day jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if jsonb_array_length(coalesce(p_day -> 'slots', '[]')) > 300
     or jsonb_array_length(coalesce(p_day -> 'waitlist', '[]')) > 300
     or jsonb_array_length(coalesce(p_day -> 'staff', '[]')) > 50
     or jsonb_array_length(coalesce(p_day -> 'tasks', '[]')) > 100 then
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
  insert into staff_tasks (ws, staff_id, text)
  select p_ws, j ->> 'staff', j ->> 'text'
  from jsonb_array_elements(coalesce(p_day -> 'tasks', '[]')) j
  where exists (select 1 from staff s where s.ws = p_ws and s.id = j ->> 'staff');
end $$;

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
  delete from staff_tasks where ws = p_ws;
  delete from notices where ws = p_ws;
  update workspaces set now_min = coalesce((p_day ->> 'now_min')::int, 600), auto_cover = true where id = p_ws;
  perform load_day(p_ws, p_day);
  perform log_event(p_ws, 'DAY_LOADED', 'RESET', null, null, null, '{}');
  return true;
end $$;

revoke all on function public.cover_absence_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.cover_absence(uuid, text, text), public.reassign_task(uuid, text, bigint, text),
  public.read_notice(uuid, text, bigint)
to anon, authenticated;
