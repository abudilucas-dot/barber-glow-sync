-- 1. Colunas faltantes
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.shop_services
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending','confirmed','completed','cancelled','no_show'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.barbershops(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 2. Eventos de webhook (idempotência)
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- 3. get_booked_slots com período padrão
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  _shop_id uuid,
  _from date DEFAULT CURRENT_DATE,
  _to date DEFAULT (CURRENT_DATE + 60)
)
RETURNS TABLE(barber_id uuid, date date, "time" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.barber_id, a.date, a.time
  FROM public.appointments a
  WHERE a.shop_id = _shop_id
    AND a.date BETWEEN _from AND _to
    AND a.status <> 'cancelled';
$$;

-- 4. Horários livres
CREATE OR REPLACE FUNCTION public.get_available_slots(
  _shop_id uuid,
  _service_id uuid,
  _date date,
  _barber_id uuid DEFAULT NULL
)
RETURNS TABLE(barber_id uuid, start_time text, end_time text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mins integer;
BEGIN
  SELECT COALESCE(s.duration_minutes, 30) INTO mins
  FROM public.shop_services s
  WHERE s.id = _service_id AND s.shop_id = _shop_id;
  IF mins IS NULL THEN mins := 30; END IF;

  RETURN QUERY
  SELECT b.id,
         to_char(g.slot, 'HH24:MI'),
         to_char(g.slot + make_interval(mins => mins), 'HH24:MI')
  FROM public.barbers b
  CROSS JOIN LATERAL (
    SELECT generate_series(
      _date::timestamp + interval '9 hours',
      _date::timestamp + interval '18 hours',
      interval '30 minutes'
    ) AS slot
  ) g
  WHERE b.shop_id = _shop_id
    AND b.active
    AND (_barber_id IS NULL OR b.id = _barber_id)
    AND (_date > CURRENT_DATE OR g.slot > now())
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.barber_id = b.id
        AND a.date = _date
        AND a.status <> 'cancelled'
        AND a.time = to_char(g.slot, 'HH24:MI')
    )
  ORDER BY b.id, g.slot;
END;
$$;

-- 5. Criar reserva
CREATE OR REPLACE FUNCTION public.create_booking(
  _shop_id uuid,
  _service_id uuid,
  _barber_id uuid,
  _date date,
  _start_time text,
  _client_name text,
  _client_phone text
)
RETURNS TABLE(id uuid, barber_id uuid, client_id uuid, service text, date date, "time" text, status text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_barber uuid;
  v_service text;
  v_id uuid;
BEGIN
  SELECT s.name INTO v_service
  FROM public.shop_services s
  WHERE s.id = _service_id AND s.shop_id = _shop_id;
  IF v_service IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado.';
  END IF;

  v_barber := _barber_id;
  IF v_barber IS NULL THEN
    SELECT b.id INTO v_barber
    FROM public.barbers b
    WHERE b.shop_id = _shop_id AND b.active
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.barber_id = b.id AND a.date = _date
          AND a.time = _start_time AND a.status <> 'cancelled')
    ORDER BY random() LIMIT 1;
  END IF;
  IF v_barber IS NULL THEN
    RAISE EXCEPTION 'Nenhum barbeiro disponível nesse horário.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.barber_id = v_barber AND a.date = _date
      AND a.time = _start_time AND a.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Horário já reservado.';
  END IF;

  v_client := public.upsert_client(_shop_id, _client_name, _client_phone);

  INSERT INTO public.appointments (shop_id, client_id, barber_id, service, date, time, status)
  VALUES (_shop_id, v_client, v_barber, v_service, _date, _start_time, 'pending')
  RETURNING appointments.id INTO v_id;

  RETURN QUERY
  SELECT a.id, a.barber_id, a.client_id, a.service, a.date, a.time, a.status
  FROM public.appointments a WHERE a.id = v_id;
END;
$$;

-- 6. Cancelar reserva
CREATE OR REPLACE FUNCTION public.cancel_appointment(_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_shop uuid;
BEGIN
  SELECT shop_id INTO v_shop FROM public.appointments WHERE id = _appointment_id;
  IF v_shop IS NULL THEN RETURN false; END IF;
  IF NOT (public.is_shop_owner(v_shop, auth.uid()) OR public.is_staff(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  UPDATE public.appointments SET status = 'cancelled' WHERE id = _appointment_id;
  RETURN true;
END;
$$;

-- 7. Atualizar dados da barbearia
CREATE OR REPLACE FUNCTION public.update_shop_profile(
  _shop_id uuid,
  _name text,
  _slug text,
  _tagline text,
  _about text,
  _hero_url text,
  _instagram_url text,
  _maps_url text,
  _owner_whatsapp text
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  UPDATE public.barbershops SET
    name = _name,
    slug = _slug,
    tagline = _tagline,
    about = _about,
    hero_url = NULLIF(_hero_url, ''),
    instagram_url = NULLIF(_instagram_url, ''),
    maps_url = NULLIF(_maps_url, ''),
    owner_whatsapp = _owner_whatsapp,
    updated_at = now()
  WHERE id = _shop_id;
  RETURN true;
END;
$$;

-- 8. Dados padrão de uma barbearia nova
CREATE OR REPLACE FUNCTION public.initialize_shop_schedule(_shop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.shop_hours WHERE shop_id = _shop_id) THEN
    INSERT INTO public.shop_hours (shop_id, days, hours, sort_order) VALUES
      (_shop_id, 'Segunda a Sexta', '09:00 às 19:00', 1),
      (_shop_id, 'Sábado', '09:00 às 18:00', 2),
      (_shop_id, 'Domingo', 'Fechado', 3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.shop_services WHERE shop_id = _shop_id) THEN
    INSERT INTO public.shop_services (shop_id, name, price, duration, duration_minutes, sort_order) VALUES
      (_shop_id, 'Corte Masculino', 45, '30 min', 30, 1),
      (_shop_id, 'Barba', 35, '30 min', 30, 2),
      (_shop_id, 'Combo Corte + Barba', 70, '1h', 60, 3);
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_barber_schedule(_barber_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_shop uuid;
BEGIN
  SELECT shop_id INTO v_shop FROM public.barbers WHERE id = _barber_id;
  IF v_shop IS NULL THEN RETURN false; END IF;
  IF NOT (public.is_shop_owner(v_shop, auth.uid()) OR public.is_staff(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  UPDATE public.barbers SET active = true WHERE id = _barber_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, uuid, date, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_shop_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_barber_schedule(uuid) TO authenticated;