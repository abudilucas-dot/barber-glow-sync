
-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Existing team accounts become staff
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- 2. Clients: staff only
DROP POLICY IF EXISTS "Staff can read clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can delete clients" ON public.clients;

CREATE POLICY "Staff can read clients"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 3. Appointments: no public read; staff-only management
DROP POLICY IF EXISTS "Booked slots are publicly readable" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can cancel appointments" ON public.appointments;

CREATE POLICY "Staff can read appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can cancel appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4. Barbers: staff-only management (public read stays)
DROP POLICY IF EXISTS "Staff can manage barbers" ON public.barbers;

CREATE POLICY "Staff can manage barbers"
  ON public.barbers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 5. Public availability without client data
CREATE OR REPLACE FUNCTION public.get_booked_slots(_from date DEFAULT CURRENT_DATE, _to date DEFAULT (CURRENT_DATE + 60))
RETURNS TABLE (barber_id uuid, date date, "time" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.barber_id, a.date, a.time
  FROM public.appointments a
  WHERE a.date >= _from AND a.date <= _to
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(date, date) TO anon, authenticated, service_role;
