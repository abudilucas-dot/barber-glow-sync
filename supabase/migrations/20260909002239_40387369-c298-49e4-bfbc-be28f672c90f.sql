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
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  v_barber := NULLIF(_barber_id, '00000000-0000-0000-0000-000000000000'::uuid);
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
$function$;