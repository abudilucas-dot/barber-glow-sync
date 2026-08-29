CREATE OR REPLACE FUNCTION public.upsert_client(_name text, _whatsapp text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _digits text := regexp_replace(coalesce(_whatsapp, ''), '\D', '', 'g');
  _id uuid;
BEGIN
  IF length(_digits) < 10 THEN
    RAISE EXCEPTION 'WhatsApp inválido';
  END IF;
  IF length(btrim(coalesce(_name, ''))) < 3 THEN
    RAISE EXCEPTION 'Nome inválido';
  END IF;

  SELECT c.id INTO _id
  FROM public.clients c
  WHERE regexp_replace(c.whatsapp, '\D', '', 'g') = _digits
  ORDER BY c.created_at
  LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.clients (name, whatsapp)
    VALUES (btrim(_name), _whatsapp)
    RETURNING id INTO _id;
  ELSE
    UPDATE public.clients
    SET name = btrim(_name)
    WHERE id = _id;
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_client(text, text) TO anon, authenticated;