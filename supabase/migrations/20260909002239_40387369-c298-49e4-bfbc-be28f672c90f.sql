-- Compatibility migration generated while reconnecting Lovable to Supabase.
-- The secure public.create_booking overload (including rate limiting, locking,
-- active service/barber validation and duplicate-slot protection) already exists
-- in the preceding production migration. Do not replace it here.
DO $$
BEGIN
  RAISE NOTICE 'Keeping the existing secure public.create_booking implementation.';
END;
$$;
