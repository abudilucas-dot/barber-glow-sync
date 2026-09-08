-- BarberLink evolution: keep legacy columns/rows and add the authoritative booking model.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS booking_min_advance_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS booking_max_future_days integer NOT NULL DEFAULT 90;

ALTER TABLE public.shop_services
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

UPDATE public.shop_services
SET duration_minutes = CASE
  WHEN duration ~* '^\s*([0-9]+)\s*h\s*([0-9]+)?' THEN
    ((regexp_match(duration, '^\s*([0-9]+)\s*h\s*([0-9]+)?', 'i'))[1])::integer * 60
    + COALESCE(NULLIF((regexp_match(duration, '^\s*([0-9]+)\s*h\s*([0-9]+)?', 'i'))[2], '')::integer, 0)
  WHEN duration ~ '[0-9]+' THEN (regexp_match(duration, '([0-9]+)'))[1]::integer
  ELSE 30
END
WHERE duration_minutes IS NULL;

ALTER TABLE public.shop_services
  ALTER COLUMN duration_minutes SET DEFAULT 30,
  ALTER COLUMN duration_minutes SET NOT NULL;

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.shop_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_name_snapshot text,
  ADD COLUMN IF NOT EXISTS service_price_snapshot numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_duration_snapshot integer,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS status public.appointment_status NOT NULL DEFAULT 'pending';

UPDATE public.appointments a
SET service_id = s.id,
    service_name_snapshot = COALESCE(a.service_name_snapshot, a.service),
    service_price_snapshot = COALESCE(a.service_price_snapshot, s.price),
    service_duration_snapshot = COALESCE(a.service_duration_snapshot, s.duration_minutes, 30),
    start_time = COALESCE(a.start_time, CASE WHEN a.time ~ '^\d{2}:\d{2}$' THEN a.time::time ELSE '09:00'::time END)
FROM public.shop_services s
WHERE s.shop_id = a.shop_id AND s.name = a.service AND a.service_id IS NULL;

UPDATE public.appointments
SET service_name_snapshot = COALESCE(service_name_snapshot, service),
    service_duration_snapshot = COALESCE(service_duration_snapshot, 30),
    start_time = COALESCE(start_time, CASE WHEN time ~ '^\d{2}:\d{2}$' THEN time::time ELSE '09:00'::time END);

UPDATE public.appointments
SET end_time = COALESCE(end_time, start_time + make_interval(mins => service_duration_snapshot));

CREATE TABLE IF NOT EXISTS public.shop_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT true,
  opens_at time,
  closes_at time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, weekday),
  CHECK ((NOT is_open AND opens_at IS NULL AND closes_at IS NULL) OR
         (is_open AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);

CREATE TABLE IF NOT EXISTS public.barber_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_working boolean NOT NULL DEFAULT true,
  starts_at time,
  ends_at time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barber_id, weekday),
  CHECK ((NOT is_working AND starts_at IS NULL AND ends_at IS NULL) OR
         (is_working AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at))
);

CREATE TABLE IF NOT EXISTS public.barber_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  weekday smallint CHECK (weekday BETWEEN 0 AND 6),
  break_date date,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at),
  CHECK ((weekday IS NULL) <> (break_date IS NULL))
);

CREATE TABLE IF NOT EXISTS public.blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date date NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.special_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  special_date date NOT NULL,
  is_open boolean NOT NULL DEFAULT false,
  opens_at time,
  closes_at time,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, special_date),
  CHECK ((NOT is_open AND opens_at IS NULL AND closes_at IS NULL) OR
         (is_open AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);

CREATE TABLE IF NOT EXISTS public.service_barbers (
  service_id uuid NOT NULL REFERENCES public.shop_services(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, barber_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id)
);

CREATE TABLE IF NOT EXISTS public.shop_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barber_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  phone_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_hours_shop_weekday ON public.shop_business_hours(shop_id, weekday);
CREATE INDEX IF NOT EXISTS idx_barber_hours_barber_weekday ON public.barber_working_hours(barber_id, weekday);
CREATE INDEX IF NOT EXISTS idx_blocked_times_shop_date ON public.blocked_times(shop_id, block_date);
CREATE INDEX IF NOT EXISTS idx_special_dates_shop_date ON public.special_dates(shop_id, special_date);
CREATE INDEX IF NOT EXISTS idx_service_barbers_barber ON public.service_barbers(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_lookup ON public.appointments(shop_id, barber_id, date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client_status ON public.appointments(client_id, status, date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(shop_id, status, date);
CREATE INDEX IF NOT EXISTS idx_barbershops_city ON public.barbershops(city);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_limit ON public.booking_attempts(shop_id, phone_hash, created_at DESC);

-- Conservative defaults for legacy shops. The original free-text shop_hours rows remain intact.
INSERT INTO public.shop_business_hours (shop_id, weekday, is_open, opens_at, closes_at)
SELECT s.id, d.weekday, d.weekday <> 0,
       CASE WHEN d.weekday = 0 THEN NULL ELSE '09:00'::time END,
       CASE WHEN d.weekday BETWEEN 1 AND 5 THEN '19:00'::time
            WHEN d.weekday = 6 THEN '18:00'::time ELSE NULL END
FROM public.barbershops s
CROSS JOIN generate_series(0, 6) AS d(weekday)
ON CONFLICT (shop_id, weekday) DO NOTHING;

INSERT INTO public.barber_working_hours (barber_id, weekday, is_working, starts_at, ends_at)
SELECT b.id, h.weekday, h.is_open, h.opens_at, h.closes_at
FROM public.barbers b
JOIN public.shop_business_hours h ON h.shop_id = b.shop_id
ON CONFLICT (barber_id, weekday) DO NOTHING;

-- Existing services are initially available to existing barbers in the same shop.
INSERT INTO public.service_barbers (service_id, barber_id)
SELECT s.id, b.id
FROM public.shop_services s
JOIN public.barbers b ON b.shop_id = s.shop_id
ON CONFLICT DO NOTHING;

-- Subscription data remains compatible by user_id; shop_id lets new events be shop-scoped.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id ON public.subscriptions(shop_id);

UPDATE public.subscriptions sub
SET shop_id = (
  SELECT s.id FROM public.barbershops s
  WHERE s.owner_id = sub.user_id
  ORDER BY s.created_at
  LIMIT 1
)
WHERE sub.shop_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.barbershops s
    WHERE s.owner_id = sub.user_id
  );

-- Financial fields cannot be changed with the browser table client.
REVOKE UPDATE ON public.barbershops FROM authenticated;
REVOKE INSERT ON public.clients FROM anon, authenticated;
REVOKE INSERT ON public.appointments FROM anon, authenticated;
REVOKE UPDATE ON public.appointments FROM authenticated;
DROP POLICY IF EXISTS "Anyone can register as a client" ON public.clients;
DROP POLICY IF EXISTS "Anyone can book an appointment" ON public.appointments;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Owners can read their shop subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (shop_id IS NOT NULL AND public.is_shop_owner(shop_id, auth.uid())) OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_shop_profile(
  _shop_id uuid, _name text, _slug text, _tagline text, _about text,
  _hero_url text, _instagram_url text, _maps_url text, _owner_whatsapp text,
  _address text DEFAULT NULL, _address_number text DEFAULT NULL, _neighborhood text DEFAULT NULL,
  _city text DEFAULT NULL, _state text DEFAULT NULL, _postal_code text DEFAULT NULL,
  _latitude numeric DEFAULT NULL, _longitude numeric DEFAULT NULL
)
RETURNS public.barbershops
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE updated_shop public.barbershops;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissao para editar esta barbearia';
  END IF;
  IF length(btrim(COALESCE(_name, ''))) < 3 OR _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Dados da barbearia invalidos';
  END IF;
  UPDATE public.barbershops SET
    name = btrim(_name), slug = _slug, tagline = COALESCE(_tagline, ''), about = COALESCE(_about, ''),
    hero_url = NULLIF(_hero_url, ''), instagram_url = NULLIF(_instagram_url, ''), maps_url = NULLIF(_maps_url, ''),
    owner_whatsapp = COALESCE(_owner_whatsapp, ''), address = NULLIF(_address, ''),
    address_number = NULLIF(_address_number, ''), neighborhood = NULLIF(_neighborhood, ''),
    city = NULLIF(_city, ''), state = NULLIF(_state, ''), postal_code = NULLIF(_postal_code, ''),
    latitude = _latitude, longitude = _longitude
  WHERE id = _shop_id RETURNING * INTO updated_shop;
  RETURN updated_shop;
END;
$$;
REVOKE ALL ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.initialize_shop_schedule(_shop_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())) THEN RAISE EXCEPTION 'Sem permissao'; END IF;
  INSERT INTO public.shop_business_hours (shop_id, weekday, is_open, opens_at, closes_at)
  SELECT _shop_id, d.weekday, d.weekday <> 0,
         CASE WHEN d.weekday = 0 THEN NULL ELSE '09:00'::time END,
         CASE WHEN d.weekday BETWEEN 1 AND 5 THEN '19:00'::time WHEN d.weekday = 6 THEN '18:00'::time ELSE NULL END
  FROM generate_series(0, 6) AS d(weekday)
  ON CONFLICT (shop_id, weekday) DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.initialize_barber_schedule(_barber_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_shop_id uuid;
BEGIN
  SELECT shop_id INTO v_shop_id FROM public.barbers WHERE id = _barber_id;
  IF v_shop_id IS NULL OR auth.uid() IS NULL OR NOT (public.is_shop_owner(v_shop_id, auth.uid()) OR public.is_staff(auth.uid())) THEN RAISE EXCEPTION 'Sem permissao'; END IF;
  PERFORM public.initialize_shop_schedule(v_shop_id);
  INSERT INTO public.barber_working_hours(barber_id, weekday, is_working, starts_at, ends_at)
  SELECT _barber_id, weekday, is_open, opens_at, closes_at FROM public.shop_business_hours WHERE shop_id = v_shop_id
  ON CONFLICT (barber_id, weekday) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.initialize_shop_schedule(uuid), public.initialize_barber_schedule(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initialize_shop_schedule(uuid), public.initialize_barber_schedule(uuid) TO authenticated;

-- The old global availability overload is removed. This public version reveals only slot occupancy.
DROP FUNCTION IF EXISTS public.get_booked_slots(date, date);
CREATE OR REPLACE FUNCTION public.get_booked_slots(_shop_id uuid, _from date DEFAULT CURRENT_DATE, _to date DEFAULT (CURRENT_DATE + 60))
RETURNS TABLE(barber_id uuid, date date, "time" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.barber_id, a.date, COALESCE(a.start_time::text, a.time)
  FROM public.appointments a
  JOIN public.barbershops s ON s.id = a.shop_id
  WHERE a.shop_id = _shop_id
    AND s.status = 'active' AND (s.plan = 'pro' OR s.trial_ends_at > now())
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.date BETWEEN _from AND _to
$$;
REVOKE ALL ON FUNCTION public.get_booked_slots(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid, date, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_available_slots(
  _shop_id uuid, _service_id uuid, _date date, _barber_id uuid DEFAULT NULL
)
RETURNS TABLE(barber_id uuid, start_time time, end_time time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH shop AS (
    SELECT s.*, svc.duration_minutes
    FROM public.barbershops s
    JOIN public.shop_services svc ON svc.id = _service_id AND svc.shop_id = s.id AND svc.active
    WHERE s.id = _shop_id AND s.status = 'active'
      AND (s.plan = 'pro' OR s.trial_ends_at > now())
      AND _date >= CURRENT_DATE AND _date <= CURRENT_DATE + s.booking_max_future_days
  ), business AS (
    SELECT COALESCE(sd.is_open, bh.is_open) AS is_open,
           COALESCE(sd.opens_at, bh.opens_at) AS opens_at,
           COALESCE(sd.closes_at, bh.closes_at) AS closes_at,
           shop.duration_minutes, shop.booking_min_advance_minutes
    FROM shop
    LEFT JOIN public.shop_business_hours bh ON bh.shop_id = shop.id
      AND bh.weekday = EXTRACT(DOW FROM _date)::smallint
    LEFT JOIN public.special_dates sd ON sd.shop_id = shop.id AND sd.special_date = _date
  ), candidates AS (
    SELECT b.id AS barber_id, slot.value::time AS start_time, (slot.value + make_interval(mins => business.duration_minutes))::time AS end_time
    FROM shop
    JOIN business ON business.is_open AND business.opens_at IS NOT NULL AND business.closes_at IS NOT NULL
    JOIN public.barbers b ON b.shop_id = shop.id AND b.active AND (_barber_id IS NULL OR b.id = _barber_id)
    JOIN public.barber_working_hours wh ON wh.barber_id = b.id
      AND wh.weekday = EXTRACT(DOW FROM _date)::smallint AND wh.is_working
    LEFT JOIN public.service_barbers sb ON sb.barber_id = b.id AND sb.service_id = _service_id
    CROSS JOIN LATERAL generate_series(
      (_date + GREATEST(business.opens_at, wh.starts_at))::timestamp,
      (_date + LEAST(business.closes_at, wh.ends_at) - make_interval(mins => business.duration_minutes))::timestamp,
      interval '15 minutes'
    ) AS slot(value)
    WHERE sb.service_id IS NOT NULL
      AND slot.value >= now() + make_interval(mins => business.booking_min_advance_minutes)
  )
  SELECT c.barber_id, c.start_time, c.end_time
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.barber_breaks br
    WHERE br.barber_id = c.barber_id AND (br.break_date = _date OR br.weekday = EXTRACT(DOW FROM _date)::smallint)
      AND c.start_time < br.ends_at AND c.end_time > br.starts_at
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_times bt
    WHERE bt.shop_id = _shop_id AND bt.block_date = _date AND (bt.barber_id IS NULL OR bt.barber_id = c.barber_id)
      AND c.start_time < bt.ends_at AND c.end_time > bt.starts_at
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.barber_id = c.barber_id AND a.date = _date AND a.status NOT IN ('cancelled', 'no_show')
      AND c.start_time < a.end_time AND c.end_time > a.start_time
  )
  ORDER BY c.start_time, c.barber_id
$$;
REVOKE ALL ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking(
  _shop_id uuid, _service_id uuid, _barber_id uuid, _date date, _start_time time,
  _client_name text, _client_phone text
)
RETURNS TABLE(appointment_id uuid, barber_id uuid, start_time time, end_time time, status public.appointment_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(COALESCE(_client_phone, ''), '\D', '', 'g');
  v_phone_hash text;
  v_client_id uuid;
  v_barber_id uuid;
  v_end_time time;
  v_service public.shop_services;
  v_appointment public.appointments;
BEGIN
  IF length(btrim(COALESCE(_client_name, ''))) < 3 OR length(v_phone) < 10 THEN
    RAISE EXCEPTION 'Dados do cliente invalidos';
  END IF;
  v_phone_hash := encode(digest(v_phone, 'sha256'), 'hex');
  IF (SELECT count(*) FROM public.booking_attempts WHERE shop_id = _shop_id AND phone_hash = v_phone_hash AND created_at > now() - interval '15 minutes') >= 5 THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde alguns minutos.';
  END IF;
  INSERT INTO public.booking_attempts(shop_id, phone_hash) VALUES (_shop_id, v_phone_hash);
  PERFORM pg_advisory_xact_lock(hashtextextended(_shop_id::text || ':' || v_phone_hash, 0));

  SELECT * INTO v_service FROM public.shop_services WHERE id = _service_id AND shop_id = _shop_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Servico invalido'; END IF;

  IF _barber_id IS NULL THEN
    SELECT a.barber_id, a.end_time INTO v_barber_id, v_end_time
    FROM public.get_available_slots(_shop_id, _service_id, _date, NULL) a
    WHERE a.start_time = _start_time ORDER BY a.barber_id LIMIT 1;
  ELSE
    SELECT a.barber_id, a.end_time INTO v_barber_id, v_end_time
    FROM public.get_available_slots(_shop_id, _service_id, _date, _barber_id) a
    WHERE a.start_time = _start_time LIMIT 1;
  END IF;
  IF v_barber_id IS NULL THEN RAISE EXCEPTION 'Horario indisponivel'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_barber_id::text || ':' || _date::text, 0));

  -- Recheck after the per-barber/date lock closes the race between availability and insert.
  IF NOT EXISTS (
    SELECT 1 FROM public.get_available_slots(_shop_id, _service_id, _date, v_barber_id) a
    WHERE a.start_time = _start_time
  ) THEN RAISE EXCEPTION 'Horario acabou de ser ocupado'; END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE shop_id = _shop_id AND regexp_replace(whatsapp, '\D', '', 'g') = v_phone
  ORDER BY created_at LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients(shop_id, name, whatsapp) VALUES (_shop_id, btrim(_client_name), _client_phone)
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE public.clients SET name = btrim(_client_name) WHERE id = v_client_id;
  END IF;

  INSERT INTO public.appointments(
    shop_id, client_id, barber_id, service, service_id, service_name_snapshot,
    service_price_snapshot, service_duration_snapshot, date, time, start_time, end_time, status
  ) VALUES (
    _shop_id, v_client_id, v_barber_id, v_service.name, v_service.id, v_service.name,
    v_service.price, v_service.duration_minutes, _date, to_char(_start_time, 'HH24:MI'),
    _start_time, v_end_time, 'confirmed'
  ) RETURNING * INTO v_appointment;
  RETURN QUERY SELECT v_appointment.id, v_appointment.barber_id, v_appointment.start_time, v_appointment.end_time, v_appointment.status;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, uuid, date, time, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, uuid, date, time, text, text) TO anon, authenticated;

-- Direct client upserts are for authenticated staff/owners only; public booking uses create_booking.
CREATE OR REPLACE FUNCTION public.upsert_client(_shop_id uuid, _name text, _whatsapp text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _digits text := regexp_replace(coalesce(_whatsapp, ''), '\D', '', 'g'); _id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())) THEN RAISE EXCEPTION 'Sem permissao'; END IF;
  IF length(_digits) < 10 OR length(btrim(coalesce(_name, ''))) < 3 THEN RAISE EXCEPTION 'Cliente invalido'; END IF;
  SELECT id INTO _id FROM public.clients WHERE shop_id = _shop_id AND regexp_replace(whatsapp, '\D', '', 'g') = _digits ORDER BY created_at LIMIT 1;
  IF _id IS NULL THEN INSERT INTO public.clients(shop_id, name, whatsapp) VALUES (_shop_id, btrim(_name), _whatsapp) RETURNING id INTO _id;
  ELSE UPDATE public.clients SET name = btrim(_name), whatsapp = _whatsapp WHERE id = _id; END IF;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.upsert_client(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_client(uuid, text, text) TO authenticated;

ALTER TABLE public.shop_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business hours are public" ON public.shop_business_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage business hours" ON public.shop_business_hours FOR ALL TO authenticated USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid())) WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Barber hours are public" ON public.barber_working_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage barber hours" ON public.barber_working_hours FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND (public.is_shop_owner(b.shop_id, auth.uid()) OR public.is_staff(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND (public.is_shop_owner(b.shop_id, auth.uid()) OR public.is_staff(auth.uid()))));
CREATE POLICY "Owners manage barber breaks" ON public.barber_breaks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND (public.is_shop_owner(b.shop_id, auth.uid()) OR public.is_staff(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND (public.is_shop_owner(b.shop_id, auth.uid()) OR public.is_staff(auth.uid()))));
CREATE POLICY "Owners manage blocked times" ON public.blocked_times FOR ALL TO authenticated USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid())) WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Owners manage special dates" ON public.special_dates FOR ALL TO authenticated USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid())) WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Service assignments are public" ON public.service_barbers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage service assignments" ON public.service_barbers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.shop_services s WHERE s.id = service_id AND (public.is_shop_owner(s.shop_id, auth.uid()) OR public.is_staff(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.shop_services s WHERE s.id = service_id AND (public.is_shop_owner(s.shop_id, auth.uid()) OR public.is_staff(auth.uid()))));
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners read gallery" ON public.shop_gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage gallery" ON public.shop_gallery FOR ALL TO authenticated USING (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid())) WITH CHECK (public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Portfolio is public" ON public.barber_portfolio FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage portfolio" ON public.barber_portfolio FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND (public.is_shop_owner(b.shop_id, auth.uid()) OR public.is_staff(auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND (public.is_shop_owner(b.shop_id, auth.uid()) OR public.is_staff(auth.uid()))));

GRANT SELECT ON public.shop_business_hours, public.barber_working_hours, public.service_barbers, public.reviews, public.shop_gallery, public.barber_portfolio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_business_hours, public.barber_working_hours, public.barber_breaks, public.blocked_times, public.special_dates, public.service_barbers, public.reviews, public.shop_gallery, public.barber_portfolio TO authenticated;
GRANT ALL ON public.shop_business_hours, public.barber_working_hours, public.barber_breaks, public.blocked_times, public.special_dates, public.service_barbers, public.reviews, public.shop_gallery, public.barber_portfolio, public.booking_attempts TO service_role;
