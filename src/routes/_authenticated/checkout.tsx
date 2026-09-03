import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PLANS, type PlanId } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (search: Record<string, unknown>): { plan: PlanId } => ({
    plan: search['plan'] === "pro_yearly" ? "pro_yearly" : "pro_monthly",
  }),
  head: () => ({
    meta: [
      { title: "Assinar o BarberLink Pro" },
      {
        name: "description",
        content: "Finalize a assinatura e mantenha a página da sua barbearia no ar.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { plan } = Route.useSearch();
  const info = PLANS[plan];

  return (
    <>
      <PaymentTestModeBanner />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <Link
          to="/precos"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="size-3.5" /> Planos
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl text-gilded">{info.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {info.price}
            {info.period} — {info.note}
          </p>
          <div className="gold-rule mt-5" />
        </header>

        <div className="mt-6">
          <StripeEmbeddedCheckout
            priceId={info.priceId}
            returnUrl={
              typeof window !== "undefined"
                ? `${window.location.origin}/checkout-retorno?session_id={CHECKOUT_SESSION_ID}`
                : undefined
            }
          />
        </div>
      </main>
    </>
  );
}
