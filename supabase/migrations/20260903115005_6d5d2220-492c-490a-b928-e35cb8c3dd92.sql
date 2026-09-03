DROP POLICY IF EXISTS "Active shops are public" ON public.barbershops;
CREATE POLICY "Active shops are public" ON public.barbershops
  FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Signed in users see shops" ON public.barbershops
  FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = auth.uid() OR public.is_staff(auth.uid()));