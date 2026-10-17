-- 009 (v5.1): accounts. A live business now starts the way any business app does: sign up
-- with an email and password (Supabase Auth; email confirmation is off for this project),
-- say whether you run a business or book appointments, then go on.
--
-- An owner's account owns their business: every owner check accepts either the owner key
-- (links still work) or the signed-in owner. A client's account links every waitlist they join,
-- so one person sees all their places and visits on any device. Demo days are unchanged and
-- need no account. Additive only: same signatures replaced, nothing dropped.

alter table public.workspaces add column owner_user uuid references auth.users (id) on delete set null;
alter table public.waitlist add column user_id uuid references auth.users (id) on delete set null;
create index workspaces_owner_user on public.workspaces (owner_user) where owner_user is not null;
create index waitlist_user on public.waitlist (user_id) where user_id is not null;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60 and name !~ '[[:cntrl:]]'),
  role text check (role in ('owner', 'client')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;

-- ------------------------------------------------------------------ who may act

create or replace function public.is_owner(p_ws uuid, p_key text)
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists (select 1 from workspaces where id = p_ws and (
    (owner_hash is not null and owner_hash = hash_key(p_key)) or (owner_user is not null and owner_user = auth.uid())));
$$;

create or replace function public.role_of(p_ws uuid, p_key text)
returns text language sql stable set search_path = public, pg_temp as $$
  select case when hash_key(p_key) = owner_hash or (owner_user is not null and owner_user = auth.uid()) then 'owner'
              when hash_key(p_key) = desk_hash then 'desk' end
  from workspaces where id = p_ws;
$$;

-- ------------------------------------------------------------------ the account itself

create function public.get_profile()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'name', (select name from profiles where user_id = auth.uid()),
    'role', (select role from profiles where user_id = auth.uid())) end;
$$;

create function public.set_profile(p_name text, p_role text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('profile:' || auth.uid(), 60, 600);
  insert into profiles (user_id, name, role) values (auth.uid(), trim(p_name), p_role)
  on conflict (user_id) do update set name = excluded.name, role = coalesce(excluded.role, profiles.role);
  return jsonb_build_object('ok', true);
exception
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

create function public.my_businesses()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'salon', w.salon, 'business_type', w.business_type, 'join_code', w.join_code)
                            order by w.created_at), '[]')
  from workspaces w where auth.uid() is not null and w.owner_user = auth.uid() and w.kind = 'live';
$$;

-- Everything a client's account holds, across every place: their place in each queue, open offers
-- (each offer link works on any device), their booking, and their past visits.
create function public.my_entries()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'ws', e.ws, 'id', e.id, 'salon', w.salon, 'business_type', w.business_type, 'join_code', w.join_code, 'now_min', w.now_min,
    'state', e.status, 'service', e.service, 'minutes', e.minutes, 'consent', e.consent,
    'place', (select count(*) from waitlist x where x.ws = e.ws and x.status = 'waiting' and x.pos <= e.pos),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'start_min', s.start_min, 'minutes', s.minutes, 'expires_min', o.expires_min) order by o.created_at desc)
                        from offers o join slots s on s.ws = o.ws and s.id = o.slot_id
                        where o.ws = e.ws and o.entry_id = e.id and o.status = 'sent' and s.status = 'free'
                          and (o.expires_min is null or w.now_min < o.expires_min)), '[]'),
    'booking', (select jsonb_build_object('status', b.status, 'start_min', s.start_min, 'minutes', s.minutes, 'service', s.service,
                                          'stylist', t.name, 'stylist_present', t.present)
                from bookings b join slots s on s.ws = b.ws and s.id = b.slot_id left join staff t on t.ws = s.ws and t.id = s.staff_id
                where b.ws = e.ws and b.entry_id = e.id order by b.id desc limit 1),
    'history', coalesce((select jsonb_agg(jsonb_build_object('day', h.day, 'start_min', h.start_min, 'minutes', h.minutes, 'service', h.service, 'staff', h.staff_name)
                                          order by h.day desc, h.start_min)
                         from history h where h.ws = e.ws and h.entry_id = e.id and h.status = 'booked'), '[]')
  ) order by e.status = 'waiting' desc, w.salon), '[]')
  from waitlist e join workspaces w on w.id = e.ws
  where auth.uid() is not null and e.user_id = auth.uid();
$$;

-- ------------------------------------------------------------------ same signatures, now account-aware

-- A live business belongs to the signed-in account that creates it. Signing in is required.
create or replace function public.create_business(p_biz jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare w uuid; k text := new_key(); code text := substr(new_key(), 1, 8); j jsonb; i int := 0;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('create:' || client_ip(), 120, 600);
  perform enforce_rate('create:all', 1500, 600);
  if random() < 0.05 then perform cleanup(); end if;
  if (select count(*) from workspaces) >= 20000 then raise exception 'CAPACITY'; end if;
  if jsonb_typeof(p_biz -> 'staff') is distinct from 'array' or jsonb_array_length(p_biz -> 'staff') not between 1 and 50
     or jsonb_array_length(coalesce(p_biz -> 'services', '[]')) > 60 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
  end if;
  insert into workspaces (salon, business_type, kind, now_min, day, owner_hash, join_code, owner_user)
  values (trim(p_biz ->> 'name'), nullif(trim(coalesce(p_biz ->> 'type', '')), ''), 'live', ist_minute(), ist_date(), hash_key(k), code, auth.uid())
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

-- A signed-in client's sign-up is linked to their account; anyone else joins exactly as before.
create or replace function public.join_waitlist(p_code text, p_entry jsonb)
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
                        free_from, free_until, token_hash, source, user_id)
  values (w.id, nid, npos, trim(p_entry ->> 'name'), (p_entry ->> 'minutes')::int, p_entry ->> 'skill', (p_entry ->> 'consent')::boolean,
          now(), 'customer sign-up', p_entry ->> 'service', (p_entry ->> 'price_inr')::int,
          (p_entry ->> 'free_from')::int, (p_entry ->> 'free_until')::int, hash_key(tok), 'self sign-up', auth.uid());
  perform log_event(w.id, 'WAITLIST_ADDED', null, null, nid, null, jsonb_build_object('consent', p_entry -> 'consent', 'source', 'self sign-up'));
  select count(*) into place from waitlist where ws = w.id and status = 'waiting' and pos <= npos;
  return jsonb_build_object('ok', true, 'token', tok, 'place', place);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'code', 'DUPLICATE_ID');
  when not_null_violation then return jsonb_build_object('ok', false, 'code', 'MISSING_FIELD');
  when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'code', 'INVALID_VALUE');
end $$;

grant execute on function public.get_profile(), public.set_profile(text, text), public.my_businesses(), public.my_entries()
to anon, authenticated;
