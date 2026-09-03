-- 1. barbershops
CREATE TABLE public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  hero_url text,
  instagram_url text,
  maps_url text,
  owner_whatsapp text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '45 90% 55%',
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barbershops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershops TO authenticated;
GRANT ALL ON public.barbershops TO service_role;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershops s WHERE s.id = _shop_id AND s.owner_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_shop_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_shop_owner(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Active shops are public" ON public.barbershops
  FOR SELECT TO anon, authenticated USING (status = 'active' OR owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Owners create their shop" ON public.barbershops
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update their shop" ON public.barbershops
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Owners delete their shop" ON public.barbershops
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));

-- 2. services
CREATE TABLE public.shop_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration text NOT NULL DEFAULT '30 min',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_services TO authenticated;
GRANT ALL ON public.shop_services TO service_role;
ALTER TABLE public.shop_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are public" ON public.shop_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage services" ON public.shop_services FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

-- 3. hours
CREATE TABLE public.shop_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  days text NOT NULL,
  hours text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_hours TO authenticated;
GRANT ALL ON public.shop_hours TO service_role;
ALTER TABLE public.shop_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hours are public" ON public.shop_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage hours" ON public.shop_hours FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

-- 4. seed first shop from existing data
INSERT INTO public.barbershops (owner_id, slug, name, tagline, instagram_url, maps_url, owner_whatsapp, plan, status)
SELECT ur.user_id, 'navalha-de-ouro', 'Navalha de Ouro', 'Barbearia & Clube do Cavalheiro',
  'https://www.instagram.com/lucas_abudi',
  'https://www.google.com/maps/place/CEEP+Maring%C3%A1/@-23.4083326,-51.9745444,16z',
  '5544991298462', 'pro', 'active'
FROM public.user_roles ur ORDER BY ur.created_at LIMIT 1;

INSERT INTO public.shop_services (shop_id, name, price, duration, sort_order)
SELECT s.id, v.name, v.price, v.duration, v.ord
FROM public.barbershops s
CROSS JOIN (VALUES
  ('Corte Masculino', 45, '40 min', 1),
  ('Barba Imperial', 35, '30 min', 2),
  ('Combo (Corte + Barba)', 70, '1h 10min', 3),
  ('Corte Infantil', 40, '30 min', 4),
  ('Pigmentação / Disfarce', 30, '25 min', 5),
  ('Sobrancelha na Navalha', 20, '15 min', 6)
) AS v(name, price, duration, ord)
WHERE s.slug = 'navalha-de-ouro';

INSERT INTO public.shop_hours (shop_id, days, hours, sort_order)
SELECT s.id, v.days, v.hours, v.ord
FROM public.barbershops s
CROSS JOIN (VALUES
  ('Segunda a Sexta', '09h às 19h', 1),
  ('Sábado', '09h às 18h', 2),
  ('Domingo', 'Fechado', 3)
) AS v(days, hours, ord)
WHERE s.slug = 'navalha-de-ouro';

-- 5. scope existing tables to a shop
ALTER TABLE public.barbers ADD COLUMN shop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN shop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN shop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;

UPDATE public.barbers SET shop_id = (SELECT id FROM public.barbershops WHERE slug = 'navalha-de-ouro') WHERE shop_id IS NULL;
UPDATE public.clients SET shop_id = (SELECT id FROM public.barbershops WHERE slug = 'navalha-de-ouro') WHERE shop_id IS NULL;
UPDATE public.appointments SET shop_id = (SELECT id FROM public.barbershops WHERE slug = 'navalha-de-ouro') WHERE shop_id IS NULL;

CREATE INDEX idx_barbers_shop ON public.barbers(shop_id);
CREATE INDEX idx_clients_shop ON public.clients(shop_id);
CREATE INDEX idx_appointments_shop ON public.appointments(shop_id);

-- 6. rewrite policies to be shop-scoped
DROP POLICY IF EXISTS "Staff can manage barbers" ON public.barbers;
CREATE POLICY "Owners manage barbers" ON public.barbers FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can read clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can delete clients" ON public.clients;
CREATE POLICY "Owners read clients" ON public.clients FOR SELECT TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can cancel appointments" ON public.appointments;
CREATE POLICY "Owners read appointments" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners update appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners cancel appointments" ON public.appointments FOR DELETE TO authenticated
  USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));

-- 7. shop-scoped helpers
CREATE OR REPLACE FUNCTION public.get_booked_slots(_shop_id uuid, _from date DEFAULT CURRENT_DATE, _to date DEFAULT (CURRENT_DATE + 60))
RETURNS TABLE(barber_id uuid, date date, "time" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.barber_id, a.date, a.time
  FROM public.appointments a
  WHERE a.shop_id = _shop_id AND a.date >= _from AND a.date <= _to
$$;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid, date, date) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.upsert_client(_shop_id uuid, _name text, _whatsapp text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _digits text := regexp_replace(coalesce(_whatsapp, ''), '\D', '', 'g');
  _id uuid;
BEGIN
  IF length(_digits) < 10 THEN RAISE EXCEPTION 'WhatsApp inválido'; END IF;
  IF length(btrim(coalesce(_name, ''))) < 3 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _shop_id) THEN RAISE EXCEPTION 'Barbearia inválida'; END IF;

  SELECT c.id INTO _id FROM public.clients c
  WHERE c.shop_id = _shop_id AND regexp_replace(c.whatsapp, '\D', '', 'g') = _digits
  ORDER BY c.created_at LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.clients (shop_id, name, whatsapp) VALUES (_shop_id, btrim(_name), _whatsapp) RETURNING id INTO _id;
  ELSE
    UPDATE public.clients SET name = btrim(_name) WHERE id = _id;
  END IF;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_client(uuid, text, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.upsert_client(text, text);

-- 8. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_barbershops_updated BEFORE UPDATE ON public.barbershops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_services_updated BEFORE UPDATE ON public.shop_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_hours_updated BEFORE UPDATE ON public.shop_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();