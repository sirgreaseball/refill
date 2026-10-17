-- 003: belt and braces on access, and offers that lapse as the clock passes their hold window.

-- RLS with no policies already hides every row. Also take away the table privileges
-- themselves, so the public key cannot even attempt a direct read or write.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Lapse every open offer whose hold window has passed, and say so in the evidence log.
create function public.expire_offers(p_ws uuid, p_now int)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare o record; n int := 0;
begin
  for o in
    update offers set status = 'expired', responded_at = now()
    where ws = p_ws and status = 'sent' and expires_min is not null and expires_min <= p_now
    returning slot_id, entry_id, expires_min
  loop
    perform log_event(p_ws, 'OFFER_EXPIRED', 'NO_REPLY', o.slot_id, o.entry_id, null, jsonb_build_object('expires_min', o.expires_min));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.expire_offers(uuid, int) from public, anon, authenticated;

create or replace function public.set_clock(p_ws uuid, p_now int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  if p_now is null or p_now < 0 or p_now > 1439 then raise exception 'INVALID_VALUE'; end if;
  update workspaces set now_min = p_now where id = p_ws;
  if not found then return false; end if;
  perform expire_offers(p_ws, p_now);
  return true;
end $$;

-- send_offers: lapse stale offers first, so an expired offer never blocks a fresh one.
create or replace function public.send_offers(p_ws uuid, p_slot text, p_entries text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s slots; w workspaces; e waitlist; eid text; code text; v_offer uuid; v_out jsonb := '[]'; v_exp int;
begin
  perform enforce_rate('ws:' || p_ws, 240, 60);
  if coalesce(array_length(p_entries, 1), 0) > 50 then raise exception 'TOO_LARGE'; end if;
  select * into w from workspaces where id = p_ws;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  perform expire_offers(p_ws, w.now_min);
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
