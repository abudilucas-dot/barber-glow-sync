-- Compatibilidade do editor Lovable, preservando as proteções de agenda já existentes.
-- Esta migration ainda não havia sido aplicada; não altera o histórico remoto do banco.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.subscription_events (
  stripe_event_id text PRIMARY KEY,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_events FROM anon, authenticated;
GRANT ALL ON public.subscription_events TO service_role;

-- Mantém a assinatura de texto usada pelo navegador, mas delega para a RPC
-- segura (assinatura time) que valida serviço/barbeiro, rate limit e concorrência.
CREATE OR REPLACE FUNCTION public.create_booking(
  _shop_id uuid,
  _service_id uuid,
  _barber_id uuid,
  _date date,
  _start_time text,
  _client_name text,
  _client_phone text
)
RETURNS TABLE(
  id uuid,
  barber_id uuid,
  client_id uuid,
  service text,
  date date,
  "time" text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_start_time time;
BEGIN
  IF COALESCE(_start_time, '') !~ '^\\d{2}:\\d{2}(:\\d{2})?$' THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;
  v_start_time := _start_time::time;

  RETURN QUERY
  SELECT a.id, a.barber_id, a.client_id, a.service, a.date, a.time, a.status::text
  FROM public.create_booking(
    _shop_id,
    _service_id,
    _barber_id,
    _date,
    v_start_time,
    _client_name,
    _client_phone
  ) secured
  JOIN public.appointments a ON a.id = secured.appointment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, uuid, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, uuid, date, text, text, text) TO anon, authenticated;

-- O painel espera um boolean, mas a operação mantém o histórico e valida dono/staff.
DROP FUNCTION IF EXISTS public.cancel_appointment(uuid);
CREATE FUNCTION public.cancel_appointment(_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = _appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;
  IF auth.uid() IS NULL OR NOT (
    public.is_shop_owner(v_appointment.shop_id, auth.uid()) OR public.is_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.appointments SET status = 'cancelled' WHERE id = _appointment_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_appointment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid) TO authenticated;

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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF length(btrim(COALESCE(_name, ''))) < 3 OR _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Dados da barbearia inválidos';
  END IF;
  UPDATE public.barbershops SET
    name = btrim(_name),
    slug = _slug,
    tagline = COALESCE(_tagline, ''),
    about = COALESCE(_about, ''),
    hero_url = NULLIF(_hero_url, ''),
    instagram_url = NULLIF(_instagram_url, ''),
    maps_url = NULLIF(_maps_url, ''),
    owner_whatsapp = COALESCE(_owner_whatsapp, ''),
    updated_at = now()
  WHERE id = _shop_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_shop_profile(uuid, text, text, text, text, text, text, text, text) TO authenticated;

-- Garante horários visíveis no painel e na página pública de novas barbearias.
DROP FUNCTION IF EXISTS public.initialize_barber_schedule(uuid);
DROP FUNCTION IF EXISTS public.initialize_shop_schedule(uuid);

CREATE FUNCTION public.initialize_shop_schedule(_shop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.is_shop_owner(_shop_id, auth.uid()) OR public.is_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.shop_hours WHERE shop_id = _shop_id) THEN
    INSERT INTO public.shop_hours (shop_id, days, hours, sort_order)
    VALUES
      (_shop_id, 'Segunda a Sexta', '09:00 às 19:00', 1),
      (_shop_id, 'Sábado', '09:00 às 18:00', 2),
      (_shop_id, 'Domingo', 'Fechado', 3);
  END IF;

  INSERT INTO public.shop_business_hours (shop_id, weekday, is_open, opens_at, closes_at)
  SELECT
    _shop_id,
    d.weekday,
    d.weekday <> 0,
    CASE WHEN d.weekday = 0 THEN NULL ELSE '09:00'::time END,
    CASE
      WHEN d.weekday BETWEEN 1 AND 5 THEN '19:00'::time
      WHEN d.weekday = 6 THEN '18:00'::time
      ELSE NULL
    END
  FROM generate_series(0, 6) AS d(weekday)
  ON CONFLICT (shop_id, weekday) DO NOTHING;
  RETURN true;
END;
$$;

CREATE FUNCTION public.initialize_barber_schedule(_barber_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
BEGIN
  SELECT shop_id INTO v_shop_id FROM public.barbers WHERE id = _barber_id;
  IF v_shop_id IS NULL OR auth.uid() IS NULL OR NOT (
    public.is_shop_owner(v_shop_id, auth.uid()) OR public.is_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  PERFORM public.initialize_shop_schedule(v_shop_id);
  INSERT INTO public.barber_working_hours (barber_id, weekday, is_working, starts_at, ends_at)
  SELECT _barber_id, weekday, is_open, opens_at, closes_at
  FROM public.shop_business_hours
  WHERE shop_id = v_shop_id
  ON CONFLICT (barber_id, weekday) DO NOTHING;
  UPDATE public.barbers SET active = true WHERE id = _barber_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_shop_schedule(uuid), public.initialize_barber_schedule(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initialize_shop_schedule(uuid), public.initialize_barber_schedule(uuid) TO authenticated;
