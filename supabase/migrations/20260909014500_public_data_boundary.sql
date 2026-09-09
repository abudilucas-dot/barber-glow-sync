-- Keep the owner's contact details in the private table. Public pages read a
-- deliberately limited view instead of public.barbershops directly.
DROP POLICY IF EXISTS "Active shops are public" ON public.barbershops;
DROP POLICY IF EXISTS "Signed in users see shops" ON public.barbershops;

CREATE POLICY "Owners and staff read private shops"
ON public.barbershops
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));

REVOKE SELECT ON TABLE public.barbershops FROM anon;

CREATE OR REPLACE VIEW public.public_barbershops
WITH (security_barrier = true)
AS
SELECT
  s.id,
  NULL::uuid AS owner_id,
  s.slug,
  s.name,
  s.tagline,
  s.about,
  s.hero_url,
  s.instagram_url,
  s.maps_url,
  ''::text AS owner_whatsapp,
  s.primary_color,
  s.plan,
  s.status,
  s.trial_ends_at,
  s.city,
  s.neighborhood,
  s.address,
  s.state,
  s.created_at
FROM public.barbershops s
WHERE s.status = 'active'
  AND (s.plan = 'pro' OR s.trial_ends_at > now());

REVOKE ALL ON TABLE public.public_barbershops FROM PUBLIC;
GRANT SELECT ON TABLE public.public_barbershops TO anon, authenticated;

-- Public booking only needs availability and the guarded booking transaction.
-- All management RPCs must never be callable anonymously.
REVOKE ALL ON FUNCTION public.cancel_appointment(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_booked_slots(uuid, date, date) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_shop_schedule(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.initialize_barber_schedule(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_client(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric) FROM anon;

-- Explicit grants make the intended public surface auditable.
REVOKE ALL ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, uuid, date, time, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, uuid, date, time, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, uuid, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, uuid, date, text, text, text) TO anon, authenticated;
