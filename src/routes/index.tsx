import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, MapPin, MessageCircle, Scissors, Clock, ShieldCheck } from "lucide-react";

import heroImage from "@/assets/hero-barbearia.jpg";
import { BookingFlow } from "@/components/BookingFlow";
import { Button } from "@/components/ui/button";
import { SERVICES, SHOP, waLink } from "@/lib/barber-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navalha de Ouro — Barbearia | Agende seu horário online" },
      {
        name: "description",
        content:
          "Barbearia Navalha de Ouro: cortes clássicos, barba imperial e combo. Agende online com o seu barbeiro em poucos toques.",
      },
      { property: "og:title", content: "Navalha de Ouro — Barbearia" },
      {
        property: "og:description",
        content:
          "Agende corte, barba ou combo com o barbeiro da sua preferência. Segunda a sábado, 09h às 19h.",
      },
      { property: "og:url", content: "https://barber-glow-sync.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://barber-glow-sync.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-gold">
          Est. 2014
        </p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
          <span className="text-gilded">{SHOP.name}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{SHOP.tagline}</p>
        <div className="gold-rule mx-auto mt-6 w-40" />
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-gold/20">
        <img
          src={heroImage}
          alt="Interior da barbearia Navalha de Ouro com cadeira clássica e detalhes dourados"
          width={1600}
          height={1008}
          className="h-56 w-full object-cover sm:h-72"
        />
      </div>

      <nav className="mt-8 grid gap-3">
        <Button asChild size="lg" className="h-14 text-base">
          <a href="#agendar">
            <Scissors className="size-5" /> Agendar Horário
          </a>
        </Button>
        <div className="grid gap-3 sm:grid-cols-3">
          <LinkButton href={SHOP.instagram} icon={<Instagram className="size-4" />}>
            Instagram
          </LinkButton>
          <LinkButton href={SHOP.maps} icon={<MapPin className="size-4" />}>
            Localização
          </LinkButton>
          <LinkButton
            href={waLink(SHOP.ownerWhatsapp, "Olá! Vim pelo link da barbearia.")}
            icon={<MessageCircle className="size-4" />}
          >
            Falar com o dono
          </LinkButton>
        </div>
      </nav>

      <section className="panel-lux mt-10 rounded-2xl p-5 sm:p-7">
        <h2 className="text-xl">Tabela de Preços</h2>
        <div className="gold-rule my-4" />
        <ul className="divide-y divide-border">
          {SERVICES.map((s) => (
            <li key={s.name} className="flex items-baseline gap-3 py-3">
              <span className="text-sm font-medium">{s.name}</span>
              <span className="mx-1 h-px flex-1 border-b border-dashed border-border" />
              <span className="text-xs text-muted-foreground">{s.duration}</span>
              <span className="w-20 text-right font-semibold text-gold">
                R$ {s.price},00
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-lux mt-6 rounded-2xl p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl">
          <Clock className="size-5 text-gold" /> Horário de Funcionamento
        </h2>
        <div className="gold-rule my-4" />
        <ul className="space-y-2 text-sm">
          {SHOP.hours.map((h) => (
            <li key={h.days} className="flex justify-between">
              <span className="text-muted-foreground">{h.days}</span>
              <span className="font-medium">{h.time}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="agendar" className="mt-12 scroll-mt-6">
        <h2 className="mb-5 text-center text-2xl">
          <span className="text-gilded">Agende seu horário</span>
        </h2>
        <BookingFlow />
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 uppercase tracking-[0.25em] hover:text-gold"
        >
          <ShieldCheck className="size-3.5" /> Painel de Gestão
        </Link>
        <p className="mt-4">
          © {new Date().getFullYear()} {SHOP.name}. Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}

function LinkButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Button asChild variant="outline" className="h-12 justify-center">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {icon} {children}
      </a>
    </Button>
  );
}
