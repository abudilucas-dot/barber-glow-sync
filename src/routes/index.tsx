import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Scissors, Sparkles, Store } from "lucide-react";

import heroImage from "@/assets/hero-barbearia.jpg";
import { Button } from "@/components/ui/button";
import { PLATFORM } from "@/lib/barber-store";
import { useShopDirectory } from "@/lib/shop-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarberLink — Crie a página da sua barbearia com agendamento" },
      {
        name: "description",
        content:
          "Plataforma para barbearias: crie sua página com link próprio, tabela de preços, equipe e agendamento pelo WhatsApp. Teste 30 dias grátis.",
      },
      { property: "og:title", content: "BarberLink — A plataforma das barbearias" },
      {
        property: "og:description",
        content:
          "Página pronta, link exclusivo e agenda online para a sua barbearia. Teste 30 dias grátis e continue no plano Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { shops, ready } = useShopDirectory();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-gold">
          {PLATFORM.tagline}
        </p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
          <span className="text-gilded">{PLATFORM.name}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          {PLATFORM.description}
        </p>
        <div className="gold-rule mx-auto mt-6 w-40" />
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-gold/20">
        <img
          src={heroImage}
          alt="Barbearia clássica com cadeira de couro e detalhes dourados"
          width={1600}
          height={1008}
          className="h-56 w-full object-cover sm:h-72"
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-14 text-base">
          <Link to="/admin">
            <Sparkles className="size-5" /> Testar 30 dias grátis
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-14 text-base">
          <Link to="/precos">
            Ver planos <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <section className="panel-lux mt-12 rounded-2xl p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl">
          <Store className="size-5 text-gold" /> Barbearias na plataforma
        </h2>
        <div className="gold-rule my-4" />
        {!ready ? (
          <p className="text-sm text-muted-foreground">Carregando barbearias...</p>
        ) : shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma barbearia publicada ainda. Seja a primeira!
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shops.map((s) => (
              <li key={s.id}>
                <Link
                  to="/$slug"
                  params={{ slug: s.slug }}
                  className="block rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:border-gold/60"
                >
                  <span className="block text-sm font-semibold text-gold">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.tagline || "Barbearia"}
                  </span>
                  <span className="mt-2 flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <MapPin className="size-3" /> /{s.slug}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-lux mt-6 rounded-2xl p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl">
          <Scissors className="size-5 text-gold" /> Como funciona
        </h2>
        <div className="gold-rule my-4" />
        <ol className="space-y-3 text-sm">
          {[
            "O dono cria a conta e testa a plataforma por 30 dias grátis.",
            "Edita identidade visual, serviços, preços, equipe e horários.",
            "Recebe um link exclusivo do tipo /sua-barbearia para divulgar.",
            "Os clientes agendam e a conversa segue no WhatsApp do barbeiro.",
            "Ao fim do teste, assine o Pro (R$ 49,90/mês ou R$ 450/ano) para seguir no ar.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-gold" />
              <span className="text-muted-foreground">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 uppercase tracking-[0.25em] hover:text-gold"
        >
          Área do dono
        </Link>
        <p className="mt-4">
          © {new Date().getFullYear()} {PLATFORM.name}. Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}
