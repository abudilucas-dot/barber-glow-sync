import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Crown,
  Eraser,
  ExternalLink,
  Pencil,
  Plus,
  Scissors,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FREE_LIMITS,
  formatBR,
  maskPhone,
  onlyDigits,
  slugify,
} from "@/lib/barber-store";
import { useMyShops, useShopAdmin } from "@/lib/shop-store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do dono — BarberLink" },
      {
        name: "description",
        content:
          "Crie e edite sua barbearia: identidade, serviços, preços, equipe, horários, clientes e agenda.",
      },
      { property: "og:title", content: "Painel do dono — BarberLink" },
      {
        property: "og:description",
        content: "Gerencie sua barbearia e seu link público em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { shops, ready: shopsReady, createShop, refresh: refreshShops } = useMyShops();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && shops.length > 0) setSelected(shops[0]!.id);
  }, [shops, selected]);

  const admin = useShopAdmin(selected);
  const isFree = (admin.shop?.plan ?? "free") === "free";

  if (!shopsReady) {
    return <Shell><p className="text-sm text-muted-foreground">Carregando...</p></Shell>;
  }

  if (shops.length === 0) {
    return (
      <Shell>
        <CreateShopCard
          onCreate={async (input) => {
            const res = await createShop(input);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Barbearia criada! Agora personalize sua página.");
            setSelected(res.shop.id);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {shops.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelected(s.id)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest transition-colors ${
              selected === s.id
                ? "border-gold text-gold"
                : "border-border text-muted-foreground hover:border-gold/50"
            }`}
          >
            {s.name}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <Plus className="size-4" /> Nova
        </Button>
      </div>

      {!selected ? (
        <CreateShopCard
          onCreate={async (input) => {
            const res = await createShop(input);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Barbearia criada!");
            setSelected(res.shop.id);
          }}
        />
      ) : !admin.shop ? (
        <p className="text-sm text-muted-foreground">Carregando barbearia...</p>
      ) : (
        <>
          <div className="panel-lux mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Link público
              </p>
              <p className="text-sm font-semibold text-gold">/{admin.shop.slug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${
                  isPro ? "border-gold/60 text-gold" : "border-border text-muted-foreground"
                }`}
              >
                {isPro ? "Plano Pro" : `Teste — ${daysLeft} dia(s)`}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to="/$slug" params={{ slug: admin.shop.slug }}>
                  <ExternalLink className="size-4" /> Ver página
                </Link>
              </Button>
            </div>
          </div>

          {!isPro && (
            <div
              className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm ${
                daysLeft > 0
                  ? "border-gold/40 bg-accent/30"
                  : "border-destructive/50 bg-destructive/10"
              }`}
            >
              <span className="text-muted-foreground">
                {daysLeft > 0
                  ? `Seu teste grátis termina em ${daysLeft} dia(s). Assine o Pro para manter a página no ar.`
                  : "Seu teste grátis terminou e a página está fora do ar. Assine o Pro para reativar."}
              </span>
              <Button asChild size="sm">
                <Link to="/precos">
                  <Crown className="size-4" /> Assinar o Pro
                </Link>
              </Button>
            </div>
          )}

          <Tabs defaultValue="loja">
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ["loja", "Barbearia", Store],
                  ["servicos", "Serviços", Scissors],
                  ["horarios", "Horários", Clock],
                  ["equipe", "Equipe", Users],
                  ["clientes", "Clientes", Users],
                  ["agenda", "Agenda", CalendarClock],
                ] as const
              ).map(([value, label, Icon]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs"
                >
                  <Icon className="size-4" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="loja">
              <ShopIdentity admin={admin} onSaved={refreshShops} />
            </TabsContent>
            <TabsContent value="servicos">
              <ServicesTab admin={admin} isFree={false} />
            </TabsContent>
            <TabsContent value="horarios">
              <HoursTab admin={admin} />
            </TabsContent>
            <TabsContent value="equipe">
              <BarbersTab admin={admin} isFree={false} />
            </TabsContent>
            <TabsContent value="clientes">
              <ClientsTab admin={admin} />
            </TabsContent>
            <TabsContent value="agenda">
              <ScheduleTab admin={admin} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </Shell>
  );
}

type Admin = ReturnType<typeof useShopAdmin>;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="size-3.5" /> Site
        </Link>
        <h1 className="text-xl text-gilded">Painel do dono</h1>
      </div>
      {children}
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="panel-lux mt-4 rounded-2xl p-5 sm:p-6">{children}</section>;
}

function CreateShopCard({
  onCreate,
}: {
  onCreate: (input: {
    name: string;
    slug: string;
    tagline: string;
    ownerWhatsapp: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const finalSlug = useMemo(() => slugify(slug || name), [slug, name]);

  return (
    <Panel>
      <h2 className="text-xl">Criar minha barbearia</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comece grátis. Você poderá editar tudo depois.
      </p>
      <div className="gold-rule my-4" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da barbearia" value={name} onChange={setName} />
        <Field label="Link (/slug)" value={slug} onChange={setSlug} placeholder={finalSlug} />
        <Field label="Frase de efeito" value={tagline} onChange={setTagline} />
        <Field
          label="WhatsApp do dono"
          value={whatsapp}
          onChange={(v) => setWhatsapp(maskPhone(v))}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Seu link será: <span className="text-gold">/{finalSlug || "sua-barbearia"}</span>
      </p>
      <Button
        className="mt-5 w-full sm:w-auto"
        onClick={async () => {
          if (name.trim().length < 3) { toast.error("Informe o nome da barbearia."); return; }
          if (!finalSlug) { toast.error("Informe um link válido."); return; }
          if (onlyDigits(whatsapp).length < 10) { toast.error("WhatsApp inválido."); return; }
          await onCreate({
            name: name.trim(),
            slug: finalSlug,
            tagline: tagline.trim(),
            ownerWhatsapp: whatsapp,
          });
        }}
      >
        <Plus className="size-4" /> Criar barbearia
      </Button>
    </Panel>
  );
}

function ShopIdentity({ admin, onSaved }: { admin: Admin; onSaved: () => void }) {
  const shop = admin.shop!;
  const [form, setForm] = useState({
    name: shop.name,
    tagline: shop.tagline,
    about: shop.about,
    slug: shop.slug,
    hero_url: shop.heroUrl ?? "",
    instagram_url: shop.instagramUrl ?? "",
    maps_url: shop.mapsUrl ?? "",
    owner_whatsapp: shop.ownerWhatsapp,
  });

  useEffect(() => {
    setForm({
      name: shop.name,
      tagline: shop.tagline,
      about: shop.about,
      slug: shop.slug,
      hero_url: shop.heroUrl ?? "",
      instagram_url: shop.instagramUrl ?? "",
      maps_url: shop.mapsUrl ?? "",
      owner_whatsapp: shop.ownerWhatsapp,
    });
  }, [shop]);

  return (
    <Panel>
      <h2 className="text-xl">Identidade da barbearia</h2>
      <div className="gold-rule my-4" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field
          label="Link (/slug)"
          value={form.slug}
          onChange={(v) => setForm({ ...form, slug: slugify(v) })}
        />
        <Field
          label="Frase de efeito"
          value={form.tagline}
          onChange={(v) => setForm({ ...form, tagline: v })}
        />
        <Field
          label="WhatsApp do dono"
          value={form.owner_whatsapp}
          onChange={(v) => setForm({ ...form, owner_whatsapp: maskPhone(v) })}
        />
        <Field
          label="Instagram (URL)"
          value={form.instagram_url}
          onChange={(v) => setForm({ ...form, instagram_url: v })}
        />
        <Field
          label="Google Maps (URL)"
          value={form.maps_url}
          onChange={(v) => setForm({ ...form, maps_url: v })}
        />
        <Field
          label="Foto de capa (URL)"
          value={form.hero_url}
          onChange={(v) => setForm({ ...form, hero_url: v })}
        />
        <Field
          label="Sobre a barbearia"
          value={form.about}
          onChange={(v) => setForm({ ...form, about: v })}
        />
      </div>
      <Button
        className="mt-5"
        onClick={async () => {
          if (form.name.trim().length < 3) { toast.error("Nome inválido."); return; }
          if (!form.slug) { toast.error("Link inválido."); return; }
          const ok = await admin.updateShop({
            name: form.name.trim(),
            slug: form.slug,
            tagline: form.tagline,
            about: form.about,
            hero_url: form.hero_url || null,
            instagram_url: form.instagram_url || null,
            maps_url: form.maps_url || null,
            owner_whatsapp: form.owner_whatsapp,
          });
          if (!ok) { toast.error("Não foi possível salvar (o link pode já existir)."); return; }
          onSaved();
          toast.success("Barbearia atualizada!");
        }}
      >
        Salvar alterações
      </Button>
    </Panel>
  );
}

function ServicesTab({ admin, isFree }: { admin: Admin; isFree: boolean }) {
  const [form, setForm] = useState({ name: "", price: "", duration: "" });
  const [edit, setEdit] = useState<{ id: string; name: string; price: string; duration: string } | null>(
    null,
  );
  const limited = isFree && admin.services.length >= FREE_LIMITS.services;

  return (
    <Panel>
      <h2 className="text-xl">Serviços e preços</h2>
      <div className="gold-rule my-4" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Serviço" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Preço (R$)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        <Field
          label="Duração"
          value={form.duration}
          onChange={(v) => setForm({ ...form, duration: v })}
          placeholder="30 min"
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={limited}
            onClick={async () => {
              if (form.name.trim().length < 2) { toast.error("Informe o serviço."); return; }
              const price = Number(form.price.replace(",", "."));
              if (!Number.isFinite(price) || price < 0) { toast.error("Preço inválido."); return; }
              const ok = await admin.addService({
                name: form.name.trim(),
                price,
                duration: form.duration.trim() || "30 min",
              });
              if (!ok) { toast.error("Não foi possível adicionar."); return; }
              setForm({ name: "", price: "", duration: "" });
              toast.success("Serviço adicionado.");
            }}
          >
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </div>
      {limited && (
        <p className="mt-2 text-xs text-muted-foreground">
          Limite do plano grátis atingido ({FREE_LIMITS.services} serviços).
        </p>
      )}

      <ul className="mt-6 divide-y divide-border">
        {admin.services.map((s) =>
          edit?.id === s.id ? (
            <li key={s.id} className="grid gap-2 py-3 sm:grid-cols-4">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Input value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
              <Input
                value={edit.duration}
                onChange={(e) => setEdit({ ...edit, duration: e.target.value })}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const price = Number(edit.price.replace(",", "."));
                    if (!Number.isFinite(price)) { toast.error("Preço inválido."); return; }
                    await admin.updateService(s.id, {
                      name: edit.name.trim(),
                      price,
                      duration: edit.duration.trim(),
                    });
                    setEdit(null);
                    toast.success("Serviço atualizado.");
                  }}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ) : (
            <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.duration}</span>
              <span className="w-20 text-right font-semibold text-gold">R$ {s.price}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setEdit({ id: s.id, name: s.name, price: String(s.price), duration: s.duration })
                }
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => admin.removeService(s.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ),
        )}
      </ul>
    </Panel>
  );
}

function HoursTab({ admin }: { admin: Admin }) {
  const [form, setForm] = useState({ days: "", hours: "" });
  const [edit, setEdit] = useState<{ id: string; days: string; hours: string } | null>(null);

  return (
    <Panel>
      <h2 className="text-xl">Horário de funcionamento</h2>
      <div className="gold-rule my-4" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Dias"
          value={form.days}
          onChange={(v) => setForm({ ...form, days: v })}
          placeholder="Segunda a Sexta"
        />
        <Field
          label="Horário"
          value={form.hours}
          onChange={(v) => setForm({ ...form, hours: v })}
          placeholder="09h às 19h"
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            onClick={async () => {
              if (!form.days.trim() || !form.hours.trim())
                { toast.error("Preencha dias e horário."); return; }
              await admin.addHour({ days: form.days.trim(), hours: form.hours.trim() });
              setForm({ days: "", hours: "" });
            }}
          >
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-border">
        {admin.hours.map((h) =>
          edit?.id === h.id ? (
            <li key={h.id} className="grid gap-2 py-3 sm:grid-cols-3">
              <Input value={edit.days} onChange={(e) => setEdit({ ...edit, days: e.target.value })} />
              <Input value={edit.hours} onChange={(e) => setEdit({ ...edit, hours: e.target.value })} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await admin.updateHour(h.id, { days: edit.days, hours: edit.hours });
                    setEdit(null);
                  }}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ) : (
            <li key={h.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1 text-muted-foreground">{h.days}</span>
              <span className="font-medium">{h.hours}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEdit({ id: h.id, days: h.days, hours: h.hours })}
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => admin.removeHour(h.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ),
        )}
      </ul>
    </Panel>
  );
}

function BarbersTab({ admin, isFree }: { admin: Admin; isFree: boolean }) {
  const [form, setForm] = useState({ name: "", specialty: "", whatsapp: "" });
  const [edit, setEdit] = useState<
    { id: string; name: string; specialty: string; whatsapp: string } | null
  >(null);
  const limited = isFree && admin.barbers.length >= FREE_LIMITS.barbers;

  return (
    <Panel>
      <h2 className="text-xl">Equipe de barbeiros</h2>
      <div className="gold-rule my-4" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field
          label="Especialidade"
          value={form.specialty}
          onChange={(v) => setForm({ ...form, specialty: v })}
        />
        <Field
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(v) => setForm({ ...form, whatsapp: maskPhone(v) })}
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={limited}
            onClick={async () => {
              if (form.name.trim().length < 3) { toast.error("Informe o nome."); return; }
              if (onlyDigits(form.whatsapp).length < 10) { toast.error("WhatsApp inválido."); return; }
              const ok = await admin.addBarber({
                name: form.name.trim(),
                specialty: form.specialty.trim(),
                whatsapp: form.whatsapp,
              });
              if (!ok) { toast.error("Não foi possível adicionar."); return; }
              setForm({ name: "", specialty: "", whatsapp: "" });
            }}
          >
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </div>
      {limited && (
        <p className="mt-2 text-xs text-muted-foreground">
          O plano grátis permite {FREE_LIMITS.barbers} barbeiro. Ative o Pro para a equipe completa.
        </p>
      )}

      <ul className="mt-6 divide-y divide-border">
        {admin.barbers.map((b) =>
          edit?.id === b.id ? (
            <li key={b.id} className="grid gap-2 py-3 sm:grid-cols-4">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Input
                value={edit.specialty}
                onChange={(e) => setEdit({ ...edit, specialty: e.target.value })}
              />
              <Input
                value={edit.whatsapp}
                onChange={(e) => setEdit({ ...edit, whatsapp: maskPhone(e.target.value) })}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await admin.updateBarber(b.id, {
                      name: edit.name.trim(),
                      specialty: edit.specialty.trim(),
                      whatsapp: edit.whatsapp,
                    });
                    setEdit(null);
                    toast.success("Barbeiro atualizado.");
                  }}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ) : (
            <li key={b.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1 font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground">{b.specialty}</span>
              <span className="text-xs text-muted-foreground">{b.whatsapp}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setEdit({ id: b.id, name: b.name, specialty: b.specialty, whatsapp: b.whatsapp })
                }
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => admin.removeBarber(b.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ),
        )}
      </ul>
    </Panel>
  );
}

function ClientsTab({ admin }: { admin: Admin }) {
  const [form, setForm] = useState({ name: "", whatsapp: "" });
  const [edit, setEdit] = useState<{ id: string; name: string; whatsapp: string } | null>(null);

  return (
    <Panel>
      <h2 className="text-xl">Clientes</h2>
      <div className="gold-rule my-4" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(v) => setForm({ ...form, whatsapp: maskPhone(v) })}
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            onClick={async () => {
              if (form.name.trim().length < 3) { toast.error("Informe o nome."); return; }
              if (onlyDigits(form.whatsapp).length < 10) { toast.error("WhatsApp inválido."); return; }
              const ok = await admin.addClient(form.name.trim(), form.whatsapp);
              if (!ok) { toast.error("Não foi possível salvar."); return; }
              setForm({ name: "", whatsapp: "" });
            }}
          >
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-border">
        {admin.clients.map((c) =>
          edit?.id === c.id ? (
            <li key={c.id} className="grid gap-2 py-3 sm:grid-cols-3">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Input
                value={edit.whatsapp}
                onChange={(e) => setEdit({ ...edit, whatsapp: maskPhone(e.target.value) })}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await admin.updateClient(c.id, {
                      name: edit.name.trim(),
                      whatsapp: edit.whatsapp,
                    });
                    setEdit(null);
                    toast.success("Cliente atualizado.");
                  }}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1 font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.whatsapp}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEdit({ id: c.id, name: c.name, whatsapp: c.whatsapp })}
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => admin.removeClient(c.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ),
        )}
        {admin.clients.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">Nenhum cliente ainda.</li>
        )}
      </ul>
    </Panel>
  );
}

function ScheduleTab({ admin }: { admin: Admin }) {
  const clientName = (id: string) => admin.clients.find((c) => c.id === id)?.name ?? "Cliente";
  const barberName = (id: string) => admin.barbers.find((b) => b.id === id)?.name ?? "Barbeiro";

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl">Agenda</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const n = await admin.purgePastAppointments();
            toast.success(`${n} agendamento(s) antigo(s) removido(s).`);
          }}
        >
          <Eraser className="size-4" /> Limpar passados
        </Button>
      </div>
      <div className="gold-rule my-4" />
      <ul className="divide-y divide-border">
        {admin.appointments.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
            <span className="w-24 text-muted-foreground">{formatBR(a.date)}</span>
            <span className="w-14 font-semibold text-gold">{a.time}</span>
            <span className="flex-1">{clientName(a.clientId)}</span>
            <span className="text-xs text-muted-foreground">{a.service}</span>
            <span className="text-xs text-muted-foreground">{barberName(a.barberId)}</span>
            <Button size="icon" variant="ghost" onClick={() => admin.removeAppointment(a.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
        {admin.appointments.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">Nenhum agendamento.</li>
        )}
      </ul>
    </Panel>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = `f-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
