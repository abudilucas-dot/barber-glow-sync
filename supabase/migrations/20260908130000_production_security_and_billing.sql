-- Produção: reserva segura, privacidade de clientes e cobrança por barbearia.
-- Esta migration é incremental e não altera migrations já aplicadas.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- A antiga RPC não possui shop_id e podia cruzar clientes de barbearias diferentes.
DROP FUNCTION IF EXISTS public.upsert_client(text, text);

-- Todas as linhas legadas já foram associadas durante a migration multi-tenant.
ALTER TABLE public.clients ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.barbers ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN shop_id SET NOT NULL;

REVOKE ALL ON TABLE public.clients, public.appointments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.clients, public.appointments FROM authenticated;

-- Não expõe profissionais ou serviços desativados na página pública.
DROP POLICY IF EXISTS "Barbers are publicly readable" ON public.barbers;
DROP POLICY IF EXISTS "Services are public" ON public.shop_services;

CREATE POLICY "Public reads active barbers of live shops" ON public.barbers
  FOR SELECT TO anon
  USING (
    active
    AND EXISTS (
      SELECT 1 FROM public.barbershops s
      WHERE s.id = shop_id
        AND s.status = 'active'
        AND (s.plan = 'pro' OR s.trial_ends_at > now())
    )
  );

CREATE POLICY "Authenticated reads own or public barbers" ON public.barbers
  FOR SELECT TO authenticated
  USING (
    public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid())
    OR (
      active AND EXISTS (
        SELECT 1 FROM public.barbershops s
        WHERE s.id = shop_id
          AND s.status = 'active'
          AND (s.plan = 'pro' OR s.trial_ends_at > now())
      )
    )
  );

CREATE POLICY "Public reads active services of live shops" ON public.shop_services
  FOR SELECT TO anon
  USING (
    active
    AND EXISTS (
      SELECT 1 FROM public.barbershops s
      WHERE s.id = shop_id
        AND s.status = 'active'
        AND (s.plan = 'pro' OR s.trial_ends_at > now())
    )
  );

CREATE POLICY "Authenticated reads own or public services" ON public.shop_services
  FOR SELECT TO authenticated
  USING (
    public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid())
    OR (
      active AND EXISTS (
        SELECT 1 FROM public.barbershops s
        WHERE s.id = shop_id
          AND s.status = 'active'
          AND (s.plan = 'pro' OR s.trial_ends_at > now())
      )
    )
  );

-- A extensão pgcrypto fica no schema extensions em projetos Supabase.
CREATE OR REPLACE FUNCTION public.create_booking(
  _shop_id uuid, _service_id uuid, _barber_id uuid, _date date, _start_time time,
  _client_name text, _client_phone text
)
RETURNS TABLE(appointment_id uuid, barber_id uuid, start_time time, end_time time, status public.appointment_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_phone text := regexp_replace(COALESCE(_client_phone, ''), '\\D', '', 'g');
  v_phone_hash text;
  v_client_id uuid;
  v_barber_id uuid;
  v_end_time time;
  v_service public.shop_services;
  v_appointment public.appointments;
BEGIN
  IF length(btrim(COALESCE(_client_name, ''))) < 3 OR length(v_phone) < 10 THEN
    RAISE EXCEPTION 'Dados do cliente inválidos';
  END IF;

  v_phone_hash := encode(extensions.digest(v_phone, 'sha256'), 'hex');
  IF (
    SELECT count(*) FROM public.booking_attempts
    WHERE shop_id = _shop_id AND phone_hash = v_phone_hash
      AND created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde alguns minutos.';
  END IF;
  INSERT INTO public.booking_attempts(shop_id, phone_hash) VALUES (_shop_id, v_phone_hash);

  PERFORM pg_advisory_xact_lock(hashtextextended(_shop_id::text || ':' || v_phone_hash, 0));

  SELECT * INTO v_service
  FROM public.shop_services
  WHERE id = _service_id AND shop_id = _shop_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Serviço inválido'; END IF;

  IF _barber_id IS NULL THEN
    SELECT a.barber_id, a.end_time INTO v_barber_id, v_end_time
    FROM public.get_available_slots(_shop_id, _service_id, _date, NULL) a
    WHERE a.start_time = _start_time
    ORDER BY a.barber_id
    LIMIT 1;
  ELSE
    SELECT a.barber_id, a.end_time INTO v_barber_id, v_end_time
    FROM public.get_available_slots(_shop_id, _service_id, _date, _barber_id) a
    WHERE a.start_time = _start_time
    LIMIT 1;
  END IF;
  IF v_barber_id IS NULL THEN RAISE EXCEPTION 'Horário indisponível'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_barber_id::text || ':' || _date::text, 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.get_available_slots(_shop_id, _service_id, _date, v_barber_id) a
    WHERE a.start_time = _start_time
  ) THEN RAISE EXCEPTION 'Horário acabou de ser ocupado'; END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE shop_id = _shop_id AND regexp_replace(whatsapp, '\\D', '', 'g') = v_phone
  ORDER BY created_at LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients(shop_id, name, whatsapp)
    VALUES (_shop_id, btrim(_client_name), _client_phone)
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

  RETURN QUERY SELECT v_appointment.id, v_appointment.barber_id,
    v_appointment.start_time, v_appointment.end_time, v_appointment.status;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, uuid, date, time, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, uuid, date, time, text, text) TO anon, authenticated;

-- Cancelamento preserva o histórico em vez de apagar a reserva.
CREATE OR REPLACE FUNCTION public.cancel_appointment(_appointment_id uuid)
RETURNS public.appointments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_appointment public.appointments;
BEGIN
  SELECT * INTO v_appointment FROM public.appointments WHERE id = _appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agendamento não encontrado'; END IF;
  IF auth.uid() IS NULL OR NOT (
    public.is_shop_owner(v_appointment.shop_id, auth.uid()) OR public.is_staff(auth.uid())
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.appointments SET status = 'cancelled' WHERE id = _appointment_id RETURNING * INTO v_appointment;
  RETURN v_appointment;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_appointment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid) TO authenticated;

-- Cobrança pertence a uma barbearia, não a todas as lojas do mesmo dono.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;

UPDATE public.subscriptions sub
SET shop_id = (
  SELECT s.id FROM public.barbershops s
  WHERE s.owner_id = sub.user_id
  ORDER BY s.created_at
  LIMIT 1
)
WHERE sub.shop_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id ON public.subscriptions(shop_id);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  stripe_event_id text PRIMARY KEY,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_events FROM anon, authenticated;
GRANT ALL ON public.subscription_events TO service_role;

-- A consulta do assinante só retorna assinaturas das próprias barbearias.
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Owners view own shop subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (shop_id IS NULL OR public.is_shop_owner(shop_id, auth.uid()) OR public.is_staff(auth.uid()))
  );
