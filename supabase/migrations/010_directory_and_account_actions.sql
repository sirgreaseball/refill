-- 010: the marketplace's first step, and accounts that can act on what they hold.
--
-- Directory: live businesses are listed by default so clients can find them; the owner can
-- turn it off. The directory shows business-level facts only (name, type, services, team size,
-- queue length) and never a client's name. Demo days are never listed.
-- Account actions: a signed-in client can change or cancel a booking, leave a list, or switch
-- messages, for any place linked to their account, from any device, without the device link.
-- Claim: places joined on this device before signing in attach to the account on sign-in.
-- Additive only.

alter table public.workspaces add column listed boolean not null default true;

create function public.directory(p_q text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare q text := nullif(trim(left(coalesce(p_q, ''), 60)), '');
begin
  perform enforce_rate('dir:' || client_ip(), 240, 60);
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object(
      'name', w.salon, 'type', w.business_type, 'code', w.join_code,
      'staff', (select count(*) from staff s where s.ws = w.id and s.active),
      'waiting', (select count(*) from waitlist e where e.ws = w.id and e.status = 'waiting'),
      'services', coalesce((select jsonb_agg(jsonb_build_object('name', v.name, 'minutes', v.minutes, 'price_inr', v.price_inr) order by v.price_inr nulls last, v.name)
                            from (select * from services v where v.ws = w.id order by v.price_inr nulls last, v.name limit 6) v), '[]')) as x
    from workspaces w
    where w.kind = 'live' and w.listed and w.join_code is not null
      and (q is null or w.salon ilike '%' || q || '%' or coalesce(w.business_type, '') ilike '%' || q || '%'
           or exists (select 1 from services v where v.ws = w.id and v.name ilike '%' || q || '%'))
    order by w.created_at desc
    limit 60) t), '[]');
end $$;

create function public.set_listed(p_ws uuid, p_key text, p_listed boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  perform require_owner(p_ws, p_key);
  if p_listed is null then raise exception 'INVALID_VALUE'; end if;
  update workspaces set listed = p_listed where id = p_ws and kind = 'live';
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_LIVE'); end if;
  return jsonb_build_object('ok', true, 'listed', p_listed);
end $$;

-- The signed-in client's own entry, or nothing.
create function public.my_entry(p_ws uuid, p_entry text)
returns public.waitlist language sql stable security definer set search_path = public, pg_temp as $$
  select * from waitlist where ws = p_ws and id = p_entry and auth.uid() is not null and user_id = auth.uid();
$$;
revoke all on function public.my_entry(uuid, text) from public, anon, authenticated;

create function public.my_entry_move(p_ws uuid, p_entry text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist; sid text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('me:' || auth.uid(), 120, 60);
  select * into e from my_entry(p_ws, p_entry);
  if e.id is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select slot_id into sid from bookings where ws = e.ws and entry_id = e.id and status = 'confirmed';
  if sid is null then return jsonb_build_object('ok', false, 'code', 'NO_BOOKING'); end if;
  return open_move(e.ws, sid, 'CUSTOMER_REQUEST');
end $$;

create function public.my_entry_leave(p_ws uuid, p_entry text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist; n int := 0;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('me:' || auth.uid(), 120, 60);
  select * into e from my_entry(p_ws, p_entry);
  if e.id is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if e.status <> 'waiting' then return jsonb_build_object('ok', false, 'code', 'NOT_WAITING'); end if;
  perform 1 from offers where ws = e.ws and entry_id = e.id and status = 'sent' order by id for update;
  update offers set status = 'revoked', responded_at = now() where ws = e.ws and entry_id = e.id and status = 'sent';
  get diagnostics n = row_count;
  update waitlist set status = 'removed' where ws = e.ws and id = e.id and status = 'waiting';
  perform log_event(e.ws, 'WAITLIST_LEFT', null, null, e.id, null, jsonb_build_object('revoked_offers', n));
  return jsonb_build_object('ok', true);
end $$;

create function public.my_entry_consent(p_ws uuid, p_entry text, p_consent boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare e waitlist;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('me:' || auth.uid(), 120, 60);
  if p_consent is null then raise exception 'INVALID_VALUE'; end if;
  select * into e from my_entry(p_ws, p_entry);
  if e.id is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  return apply_consent(e.ws, e.id, p_consent, 'customer, own account');
end $$;

-- Places joined on this device before signing in: attach them to the account. Only entries
-- nobody has claimed yet; the token proves the person joined them.
create function public.claim_entries(p_tokens text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare n int := 0;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'SIGN_IN'); end if;
  perform enforce_rate('claim:' || auth.uid(), 30, 600);
  if coalesce(array_length(p_tokens, 1), 0) > 50 then raise exception 'TOO_LARGE'; end if;
  update waitlist set user_id = auth.uid()
  where user_id is null and token_hash = any (array(select hash_key(t) from unnest(coalesce(p_tokens, '{}')) t));
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'claimed', n);
end $$;

grant execute on function
  public.directory(text), public.set_listed(uuid, text, boolean),
  public.my_entry_move(uuid, text), public.my_entry_leave(uuid, text), public.my_entry_consent(uuid, text, boolean),
  public.claim_entries(text[])
to anon, authenticated;
