import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react";

import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { PLATFORM } from "@/lib/barber-store";
import { PLANS } from "@/lib/stripe";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — BarberLink para barbearias" },
      {
        name: "description",
        content:
          "Teste grátis por 30 dias. Depois, BarberLink Pro por R$ 49,90/mês ou R$ 450/ano (12x de R$ 37,50 no cartão).",
      },
      { property: "og:title", content: "Planos BarberLink — 30 dias grátis" },
      {
        property: "og:description",
        content:
          "Página da barbearia com agendamento online: teste 30 dias e continue por R$ 49,90/mês ou R$ 450/ano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const TRIAL_ITEMS = [
  "30 dias com todos os recursos liberados",
  "Link exclusivo /sua-barbearia",
  "Serviços, equipe e horários ilimitados",
  "Agendamento online com envio para o WhatsApp",
];

const PRO_ITEMS = [
  "Tudo do teste, sem prazo para acabar",
  "Página sempre no ar e indexada no Google",
  "Painel completo de clientes e agenda",
  "Cancele quando quiser, acesso até o fim do período pago",
];

function PricingPage() {
  const navigate = useNavigate();

  const goCheckout = (plan: "pro_monthly" | "pro_yearly") => {
    void navigate({ to: "/checkout", search: { plan } });
  };

  return (
    <>
      <PaymentTestModeBanner />
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="mr-1 inline size-3.5" /> {PLATFORM.name}
        </Link>

        <header className="mt-6 text-center">
          <h1 className="text-4xl leading-tight sm:text-5xl">
            <span className="text-gilded">Planos</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Comece com 30 dias grátis. Ao fim do teste, assine o Pro para manter a
            página da sua barbearia no ar.
          </p>
          <div className="gold-rule mx-auto mt-6 w-40" />
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <PlanCard
            icon={<Sparkles className="size-5 text-gold" />}
            title="Teste grátis"
            price="R$ 0"
            period="por 30 dias"
            note="Sem cartão de crédito"
            items={TRIAL_ITEMS}
            action={
              <Button asChild variant="outline" className="h-12 w-full">
                <Link to="/admin">Criar minha barbearia</Link>
              </Button>
            }
          />

          <PlanCard
            highlighted
            icon={<Crown className="size-5 text-gold" />}
            title="Pro mensal"
            price={PLANS.pro_monthly.price}
            period="/mês"
            note="Renovação automática"
            items={PRO_ITEMS}
            action={
              <Button className="h-12 w-full" onClick={() => goCheckout("pro_monthly")}>
                Assinar mensal
              </Button>
            }
          />

          <PlanCard
            icon={<Crown className="size-5 text-gold" />}
            title="Pro anual"
            price={PLANS.pro_yearly.price}
            period="/ano"
            note="12x de R$ 37,50 no cartão — economize 25%"
            items={PRO_ITEMS}
            action={
              <Button className="h-12 w-full" onClick={() => goCheckout("pro_yearly")}>
                Assinar anual
              </Button>
            }
          />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Impostos calculados automaticamente no checkout conforme a sua localização.
        </p>
      </main>
    </>
  );
}

function PlanCard({
  icon,
  title,
  price,
  period,
  note,
  items,
  action,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  price: string;
  period: string;
  note: string;
  items: string[];
  action: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <section
      className={`panel-lux flex flex-col rounded-2xl p-6 ${
        highlighted ? "border-gold/60 ring-1 ring-gold/30" : ""
      }`}
    >
      <h2 className="flex items-center gap-2 text-lg">
        {icon} {title}
      </h2>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-gold">{price}</span>
        <span className="text-xs text-muted-foreground">{period}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <div className="gold-rule my-5" />
      <ul className="flex-1 space-y-2.5 text-sm">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-gold" />
            <span className="text-muted-foreground">{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{action}</div>
    </section>
  );
}
