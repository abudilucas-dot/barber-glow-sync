ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

UPDATE public.barbershops SET plan = 'pro' WHERE slug = 'navalha-de-ouro';

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.shop_is_live(_shop public.barbershops)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT _shop.status = 'active'
     AND (_shop.plan = 'pro' OR _shop.trial_ends_at > now());
$$;

DROP POLICY IF EXISTS "Active shops are public" ON public.barbershops;
CREATE POLICY "Active shops are public"
  ON public.barbershops FOR SELECT TO anon
  USING (status = 'active' AND (plan = 'pro' OR trial_ends_at > now()));

DROP POLICY IF EXISTS "Signed in users see shops" ON public.barbershops;
CREATE POLICY "Signed in users see shops"
  ON public.barbershops FOR SELECT TO authenticated
  USING (
    (status = 'active' AND (plan = 'pro' OR trial_ends_at > now()))
    OR owner_id = auth.uid()
    OR is_staff(auth.uid())
  );