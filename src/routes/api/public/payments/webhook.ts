import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

type StripeItem = {
  current_period_start?: number;
  current_period_end?: number;
  price?: {
    lookup_key?: string | null;
    metadata?: Record<string, string> | null;
    id?: string;
    product?: string | { id: string };
  };
};

type StripeSubscriptionPayload = {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
  items?: { data?: StripeItem[] };
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

let cachedSupabase: SupabaseClient<Database> | null = null;

function getSupabase(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) throw new Error("Credenciais do Supabase não configuradas.");
  if (!cachedSupabase) cachedSupabase = createClient<Database>(url, serviceRoleKey);
  return cachedSupabase;
}

function priceOf(item: StripeItem | undefined): string | null {
  return (
    item?.price?.lookup_key ??
    item?.price?.metadata?.["lovable_external_id"] ??
    item?.price?.id ??
    null
  );
}

async function applyPlanToShop(userId: string, shopId: string, plan: "pro" | "free") {
  const { error } = await getSupabase()
    .from("barbershops")
    .update({ plan })
    .eq("id", shopId)
    .eq("owner_id", userId);
  if (error) throw error;
}

async function recordEvent(eventId: string, eventType: string, env: StripeEnv): Promise<boolean> {
  const { error } = await getSupabase().from("subscription_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    environment: env,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

async function upsertSubscription(subscription: StripeSubscriptionPayload, env: StripeEnv) {
  const userId = subscription.metadata?.["userId"];
  const shopId = subscription.metadata?.["shopId"];
  if (!userId || !shopId) throw new Error("Assinatura sem identificação da conta ou barbearia.");

  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const { error } = await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        shop_id: shopId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: typeof item?.price?.product === "string" ? item.price.product : null,
        price_id: priceOf(item),
        status: subscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );
  if (error) throw error;

  const active = ["active", "trialing", "past_due"].includes(subscription.status);
  const stillPaid =
    subscription.status === "canceled" &&
    periodEnd &&
    new Date(periodEnd * 1000).getTime() > Date.now();
  await applyPlanToShop(userId, shopId, active || stillPaid ? "pro" : "free");
}

async function handleSubscriptionDeleted(subscription: StripeSubscriptionPayload, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (error) throw error;

  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
  const stillPaid = periodEnd && new Date(periodEnd * 1000).getTime() > Date.now();
  const userId = subscription.metadata?.["userId"];
  const shopId = subscription.metadata?.["shopId"];
  if (userId && shopId && !stillPaid) await applyPlanToShop(userId, shopId, "free");
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  if (!(await recordEvent(event.id, event.type, env))) return;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object as StripeSubscriptionPayload, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as StripeSubscriptionPayload, env);
      break;
    default:
      break;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = new URL(request.url).searchParams.get("env");
        if (env !== "sandbox" && env !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (error) {
          console.error("Webhook Stripe recusado:", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
