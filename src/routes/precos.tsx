import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FREE_LIMITS, PLATFORM } from "@/lib/barber-store";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — BarberLink para barbearias" },
      {
        name: "description",
        content:
          "Comece grátis com uma barbearia e recursos limitados. Ative o plano Pro para serviços ilimitados, equipe completa e página sem limites.",
      },
      { property: "og:title", content: "Planos e preços — BarberLink" },
      {
        property: "og:description",
        content: "Grátis para começar, taxa única para publicar e mensalidade baixa para manter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      <Link
        to="/"
        className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold"
      >
        ← {PLATFORM.name}
      </Link>

      <header className="mt-6 text-center">
        <h1 className="text-4xl">
          <span className="text-gilded">Planos</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Monte sua barbearia sem pagar nada. Quando quiser crescer, ative o Pro.
        </p>
        <div className="gold-rule mx-auto mt-6 w-40" />
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <article className="panel-lux rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-gold" /> Grátis
          </h2>
          <p className="mt-1 text-3xl font-semibold text-gold">R$ 0</p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <Item>1 barbearia com link próprio</Item>
            <Item>Até {FREE_LIMITS.services} serviços cadastrados</Item>
            <Item>{FREE_LIMITS.barbers} barbeiro na equipe</Item>
            <Item>Agendamento pelo WhatsApp</Item>
          </ul>
          <Button asChild className="mt-6 w-full">
            <Link to="/admin">Começar grátis</Link>
          </Button>
        </article>

        <article className="panel-lux rounded-2xl border border-gold/50 p-6">
          <h2 className="flex items-center gap-2 text-xl">
            <Crown className="size-5 text-gold" /> Pro
          </h2>
          <p className="mt-1 text-3xl font-semibold text-gold">
            R$ 49 <span className="text-sm font-normal text-muted-foreground">taxa única</span>
          </p>
          <p className="text-xs text-muted-foreground">+ R$ 19/mês para manter a página no ar</p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <Item>Serviços e barbeiros ilimitados</Item>
            <Item>Identidade visual personalizada</Item>
            <Item>Agenda e base de clientes completa</Item>
            <Item>Suporte prioritário</Item>
          </ul>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/admin">Ativar no painel</Link>
          </Button>
        </article>
      </div>
    </main>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-gold" />
      <span>{children}</span>
    </li>
  );
}
