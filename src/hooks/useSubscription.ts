import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export type SubscriptionRow = {
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSubscription(null);
      setReady(true);
      return;
    }
    let env: "sandbox" | "live" = "sandbox";
    try {
      env = getStripeEnvironment();
    } catch {
      setSubscription(null);
      setReady(true);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", uid)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as SubscriptionRow | null) ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const isActive =
    !!subscription &&
    ((["active", "trialing", "past_due"].includes(subscription.status) &&
      (!periodEnd || periodEnd.getTime() > Date.now())) ||
      (subscription.status === "canceled" && !!periodEnd && periodEnd.getTime() > Date.now()));

  return { subscription, isActive, periodEnd, ready, refresh };
}
