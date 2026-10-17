-- 006: the client's offer page and sign-up tell the truth (issues #9, #11, #14).
-- Additive only: same signatures, `create or replace`, grants kept. The deployed client already
-- understands the new states (CANCELLED, WITHDRAWN) and the new field (max_offers).

-- #9: an accepted offer follows its booking. After a move it shows the booking's current slot and
-- staff member; after a cancellation it says CANCELLED instead of "You're booked".
-- #11: a withdrawn offer is not an opt-out. NO_CONSENT only when the client's consent is not a yes;
-- otherwise WITHDRAWN, with the reason (staff member out, booked elsewhere, slot gone, changed).
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
    'offer', o.id, 'salon', w.salon, 'expires_min', o.expires_min, 'now_min', w.now_min,
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

-- #14: the sign-up promises the cap the owner actually set.
create or replace function public.join_info(p_code text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when w.id is null then jsonb_build_object('ok', false)
    else jsonb_build_object('ok', true, 'salon', w.salon, 'max_offers', w.max_offers) end
  from (select 1) one left join workspaces w on w.join_code = p_code;
$$;
