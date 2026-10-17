-- 008: client pages know whether they belong to a demo day or a live business, so only a demo
-- says its data is synthetic. Same signatures; adds one field each.

create or replace function public.get_offer(p_offer uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when o.id is null then jsonb_build_object('state', 'NOT_FOUND') else jsonb_build_object(
    'state', case
      when o.status = 'accepted' and b.status = 'cancelled' then 'CANCELLED'
      when o.status = 'accepted' then 'CONFIRMED'
      when o.status = 'waitlisted' then 'WAITLISTED'
      when o.status = 'declined' then 'DECLINED'
      when e.consent is distinct from true then 'NO_CONSENT'
      when o.status = 'revoked' and e.status = 'booked' then 'BOOKED_ELSEWHERE'
      when o.status = 'revoked' then 'WITHDRAWN'
      when o.status = 'expired' or (o.expires_min is not null and w.now_min >= o.expires_min) then 'EXPIRED'
      when s.status <> 'free' then 'TAKEN'
      when e.status <> 'waiting' then 'BOOKED_ELSEWHERE'
      else 'OPEN' end,
    'reason', case when o.status <> 'revoked' then null
      when st.present is false or s.blocked_reason = 'STAFF_ABSENT' then 'STAFF_ABSENT'
      when e.status = 'removed' then 'LEFT_WAITLIST'
      when s.status <> 'free' then 'TAKEN'
      else 'CHANGED' end,
    'moved', b.id is not null and b.slot_id <> o.slot_id,
    'offer', o.id, 'salon', w.salon, 'kind', w.kind, 'expires_min', o.expires_min, 'now_min', w.now_min,
    'slot', jsonb_build_object('id', cs.id, 'start_min', cs.start_min, 'minutes', cs.minutes, 'skill', cs.skill,
                               'staff', (select name from staff where ws = o.ws and id = cs.staff_id)),
    'entry', jsonb_build_object('name', e.name, 'service', e.service, 'minutes', e.minutes, 'price_inr', e.price_inr,
                                'consent_at', e.consent_at, 'consent_source', e.consent_source),
    'booking', b.id,
    'winner', (select id from bookings where ws = o.ws and slot_id = o.slot_id and status = 'confirmed'),
    'place', (select count(*) from waitlist x where x.ws = o.ws and x.status = 'waiting' and x.pos <= e.pos)
  ) end
  from (select 1) one
  left join offers o on o.id = p_offer
  left join slots s on s.ws = o.ws and s.id = o.slot_id
  left join staff st on st.ws = o.ws and st.id = s.staff_id
  left join waitlist e on e.ws = o.ws and e.id = o.entry_id
  left join workspaces w on w.id = o.ws
  left join lateral (select * from bookings x where x.offer_id = o.id order by x.id desc limit 1) b on true
  -- The slot to show: where the booking is now, if this offer became one; otherwise the offered slot.
  left join slots cs on cs.ws = o.ws and cs.id = coalesce(case when b.status = 'confirmed' then b.slot_id end, o.slot_id);
$$;

create or replace function public.get_move(p_move uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m moves; s slots; w workspaces; st staff; dest slots; dst staff; live boolean;
begin
  select * into m from moves where id = p_move;
  if not found then return jsonb_build_object('state', 'NOT_FOUND'); end if;
  select * into w from workspaces where id = m.ws;
  select * into s from slots where ws = m.ws and id = m.slot_id;
  select * into st from staff where ws = m.ws and id = s.staff_id;
  live := m.status = 'open' and s.status = 'booked' and s.customer = m.customer;
  if m.to_slot is not null then
    select * into dest from slots where ws = m.ws and id = m.to_slot;
    select * into dst from staff where ws = m.ws and id = dest.staff_id;
  end if;
  return jsonb_build_object(
    'state', case when live then 'open' when m.status = 'open' then 'withdrawn' else m.status end,
    'salon', w.salon, 'kind', w.kind, 'now_min', w.now_min, 'reason', m.reason,
    'customer', split_part(m.customer, ' ', 1),
    'current', case when live then jsonb_build_object('start_min', s.start_min, 'minutes', s.minutes, 'service', s.service,
                                                       'stylist', st.name, 'stylist_present', st.present) end,
    'moved_to', case when dest.id is not null then jsonb_build_object('start_min', dest.start_min, 'minutes', dest.minutes,
                                                                      'service', dest.service, 'stylist', dst.name) end,
    'options', case when live then move_options(m.ws, m.slot_id) else '[]'::jsonb end);
end $$;
