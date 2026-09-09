-- The previous limited view was secure from a data perspective but Postgres
-- views run as the owner by default. Replace it with narrowly scoped RPCs,
-- which make the public contract explicit and never return owner contacts.
DROP VIEW IF EXISTS public.public_barbershops;

CREATE OR REPLACE FUNCTION public.get_public_shops()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  tagline text,
  about text,
  hero_url text,
  instagram_url text,
  maps_url text,
  primary_color text,
  plan text,
  status text,
  trial_ends_at timestamptz,
  city text,
  neighborhood text,
  address text,
  state text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.slug, s.name, s.tagline, s.about, s.hero_url,
    s.instagram_url, s.maps_url, s.primary_color, s.plan, s.status,
    s.trial_ends_at, s.city, s.neighborhood, s.address, s.state, s.created_at
  FROM public.barbershops s
  WHERE s.status = 'active'
    AND (s.plan = 'pro' OR s.trial_ends_at > now())
  ORDER BY s.created_at;
$$;

CREATE OR REPLACE FUNCTION public.get_public_shop(_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  tagline text,
  about text,
  hero_url text,
  instagram_url text,
  maps_url text,
  primary_color text,
  plan text,
  status text,
  trial_ends_at timestamptz,
  city text,
  neighborhood text,
  address text,
  state text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.slug, s.name, s.tagline, s.about, s.hero_url,
    s.instagram_url, s.maps_url, s.primary_color, s.plan, s.status,
    s.trial_ends_at, s.city, s.neighborhood, s.address, s.state, s.created_at
  FROM public.barbershops s
  WHERE s.slug = _slug
    AND s.status = 'active'
    AND (s.plan = 'pro' OR s.trial_ends_at > now());
$$;

REVOKE ALL ON FUNCTION public.get_public_shops() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_shop(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shops() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_shop(text) TO anon, authenticated;
