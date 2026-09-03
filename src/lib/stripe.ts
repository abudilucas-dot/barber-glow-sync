import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Os pagamentos ainda não estão configurados para esta versão do site. Conclua a ativação de pagamentos no projeto.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

/** Planos vendidos pela plataforma. */
export const PLANS = {
  pro_monthly: {
    priceId: "pro_monthly",
    label: "Pro mensal",
    price: "R$ 49,90",
    period: "/mês",
    note: "Cancele quando quiser.",
  },
  pro_yearly: {
    priceId: "pro_yearly",
    label: "Pro anual",
    price: "R$ 450",
    period: "/ano",
    note: "12x de R$ 37,50 no cartão — economize 25%.",
  },
} as const;

export type PlanId = keyof typeof PLANS;
