import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Scissors,
} from "lucide-react";

import heroImage from "@/assets/hero-barbearia.jpg";
import { BookingFlow } from "@/components/BookingFlow";
import { Button } from "@/components/ui/button";
import { PLATFORM, waLink } from "@/lib/barber-store";
import { usePublicShop } from "@/lib/shop-store";

export const Route = createFileRoute("/$slug")({
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${pretty} — Agende seu horário online` },
        {
          name: "description",
          content: `Página da barbearia ${pretty}: serviços, preços, equipe, horários e agendamento online pelo WhatsApp.`,
        },
        { property: "og:title", content: `${pretty} — Barbearia` },
        {
          property: "og:description",
          content: `Agende corte, barba ou combo na ${pretty} em poucos toques.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ShopPage,
});

function ShopPage() {
  const { slug } = Route.useParams();
  const { shop, services, hours, barbers, ready, isSlotTaken, bookAppointment } =
    usePublicShop(slug);

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">
        Carregando barbearia...
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl text-gilded">Barbearia não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O link /{slug} não existe ou ainda não foi publicado.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">
            <ArrowLeft className="size-4" /> Voltar para {PLATFORM.name}
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <Link
        to="/"
        className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold"
      >
        ← {PLATFORM.name}
      </Link>

      <header className="mt-6 text-center">
        <h1 className="text-4xl leading-tight sm:text-5xl">
          <span className="text-gilded">{shop.name}</span>
        </h1>
        {shop.tagline && (
          <p className="mt-2 text-sm text-muted-foreground">{shop.tagline}</p>
        )}
        <div className="gold-rule mx-auto mt-6 w-40" />
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-gold/20">
        <img
          src={shop.heroUrl || heroImage}
          alt={`Ambiente da barbearia ${shop.name}`}
          width={1600}
          height={1008}
          className="h-56 w-full object-cover sm:h-72"
        />
      </div>

      {shop.about && (
        <p className="mt-6 text-center text-sm text-muted-foreground">{shop.about}</p>
      )}

      <nav className="mt-8 grid gap-3">
        <Button asChild size="lg" className="h-14 text-base">
          <a href="#agendar">
            <Scissors className="size-5" /> Agendar Horário
          </a>
        </Button>
        <div className="grid gap-3 sm:grid-cols-3">
          {shop.instagramUrl && (
            <LinkButton href={shop.instagramUrl} icon={<Instagram className="size-4" />}>
              Instagram
            </LinkButton>
          )}
          {shop.mapsUrl && (
            <LinkButton href={shop.mapsUrl} icon={<MapPin className="size-4" />}>
              Localização
            </LinkButton>
          )}
          {shop.ownerWhatsapp && (
            <LinkButton
              href={waLink(shop.ownerWhatsapp, `Olá! Vim pelo link da ${shop.name}.`)}
              icon={<MessageCircle className="size-4" />}
            >
              Falar com o dono
            </LinkButton>
          )}
        </div>
      </nav>

      {services.length > 0 && (
        <section className="panel-lux mt-10 rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl">Tabela de Preços</h2>
          <div className="gold-rule my-4" />
          <ul className="divide-y divide-border">
            {services.map((s) => (
              <li key={s.id} className="flex items-baseline gap-3 py-3">
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
      )}

      {hours.length > 0 && (
        <section className="panel-lux mt-6 rounded-2xl p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-xl">
            <Clock className="size-5 text-gold" /> Horário de Funcionamento
          </h2>
          <div className="gold-rule my-4" />
          <ul className="space-y-2 text-sm">
            {hours.map((h) => (
              <li key={h.id} className="flex justify-between">
                <span className="text-muted-foreground">{h.days}</span>
                <span className="font-medium">{h.hours}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="agendar" className="mt-12 scroll-mt-6">
        <h2 className="mb-5 text-center text-2xl">
          <span className="text-gilded">Agende seu horário</span>
        </h2>
        <BookingFlow
          shop={shop}
          services={services}
          barbers={barbers}
          isSlotTaken={isSlotTaken}
          onBook={async (input) => {
            const res = await bookAppointment(input);
            return res.ok ? { ok: true } : { ok: false, error: res.error };
          }}
        />
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {shop.name}. Página criada com {PLATFORM.name}.
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
