CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL DEFAULT '',
  whatsapp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Barbers are publicly readable" ON public.barbers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff can manage barbers" ON public.barbers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can register as a client" ON public.clients FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can update clients" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barber_id, date, time)
);
CREATE INDEX appointments_date_idx ON public.appointments (date);
GRANT SELECT, INSERT ON public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Booked slots are publicly readable" ON public.appointments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can book an appointment" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can cancel appointments" ON public.appointments FOR DELETE TO authenticated USING (true);

INSERT INTO public.barbers (name, specialty, whatsapp) VALUES
  ('Rafael Moretti', 'Degradê & Navalhado', '5511988880001'),
  ('Caio Bastos', 'Barba Terapia & Toalha Quente', '5511988880002'),
  ('Diego Almeida', 'Cortes Clássicos & Pompadour', '5511988880003');