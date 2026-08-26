import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Eraser, Plus, Trash2, Users, Scissors, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatBR,
  maskPhone,
  onlyDigits,
  useBarbershop,
  type Appointment,
} from "@/lib/barber-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel de Gestão — Navalha de Ouro" },
      {
        name: "description",
        content:
          "Gerencie clientes, equipe de barbeiros e a agenda completa da barbearia Navalha de Ouro.",
      },
      { property: "og:title", content: "Painel de Gestão — Navalha de Ouro" },
      {
        property: "og:description",
        content: "Clientes, barbeiros e agenda completa da barbearia em um só lugar.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const {
    clients,
    barbers,
    appointments,
    addClient,
    removeClient,
    addBarber,
    removeBarber,
    removeAppointment,
    purgePastAppointments,
  } = useBarbershop();

  const [clientForm, setClientForm] = useState({ name: "", whatsapp: "" });
  const [barberForm, setBarberForm] = useState({
    name: "",
    specialty: "",
    whatsapp: "",
  });

  const sorted = [...appointments].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Cliente removido";
  const barberName = (id: string) =>
    barbers.find((b) => b.id === id)?.name ?? "Barbeiro removido";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold"
          >
            <ArrowLeft className="size-3.5" /> Voltar ao site
          </Link>
          <h1 className="mt-3 text-3xl">
            <span className="text-gilded">Painel de Gestão</span>
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            const n = await purgePastAppointments();
            toast.success(
              n > 0
                ? `${n} agendamento(s) vencido(s) removido(s).`
                : "Nenhum agendamento vencido encontrado.",
            );
          }}
        >
          <Eraser className="size-4" /> Limpar agenda vencida
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Clientes" value={clients.length} />
        <Stat label="Barbeiros" value={barbers.length} />
        <Stat label="Agendamentos" value={appointments.length} />
      </div>

      <Tabs defaultValue="agenda" className="mt-8">
        <TabsList className="w-full">
          <TabsTrigger value="agenda" className="flex-1">
            <CalendarClock className="size-4" /> Agenda
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex-1">
            <Users className="size-4" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="barbeiros" className="flex-1">
            <Scissors className="size-4" /> Barbeiros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-5">
          <div className="panel-lux rounded-2xl p-5">
            <h2 className="text-lg">Agenda completa</h2>
            <div className="gold-rule my-4" />
            {sorted.length === 0 ? (
              <Empty text="Nenhum agendamento registrado." />
            ) : (
              <ul className="space-y-2">
                {sorted.map((a: Appointment) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3"
                  >
                    <div className="min-w-24 text-center">
                      <span className="block text-sm font-semibold text-gold">
                        {a.time}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {formatBR(a.date)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm font-medium">
                        {clientName(a.clientId)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {a.service} · com {barberName(a.barberId)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        removeAppointment(a.id);
                        toast.success("Agendamento cancelado.");
                      }}
                    >
                      <Trash2 className="size-4" /> Cancelar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <form
              className="panel-lux h-fit space-y-4 rounded-2xl p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  clientForm.name.trim().length < 3 ||
                  onlyDigits(clientForm.whatsapp).length < 10
                ) {
                  toast.error("Preencha nome e WhatsApp válidos.");
                  return;
                }
                addClient(clientForm.name.trim(), clientForm.whatsapp);
                setClientForm({ name: "", whatsapp: "" });
                toast.success("Cliente salvo.");
              }}
            >
              <h2 className="text-lg">Novo cliente</h2>
              <div className="space-y-2">
                <Label htmlFor="ac-nome">Nome completo</Label>
                <Input
                  id="ac-nome"
                  value={clientForm.name}
                  onChange={(e) =>
                    setClientForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ac-zap">WhatsApp</Label>
                <Input
                  id="ac-zap"
                  value={clientForm.whatsapp}
                  onChange={(e) =>
                    setClientForm((f) => ({
                      ...f,
                      whatsapp: maskPhone(e.target.value),
                    }))
                  }
                  placeholder="(11) 99999-0000"
                  inputMode="tel"
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="size-4" /> Adicionar
              </Button>
            </form>

            <div className="panel-lux rounded-2xl p-5">
              <h2 className="text-lg">Clientes cadastrados</h2>
              <div className="gold-rule my-4" />
              {clients.length === 0 ? (
                <Empty text="Nenhum cliente cadastrado." />
              ) : (
                <ul className="space-y-2">
                  {clients.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3"
                    >
                      <div className="flex-1">
                        <span className="block text-sm font-medium">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.whatsapp}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Excluir ${c.name}`}
                        onClick={() => {
                          removeClient(c.id);
                          toast.success("Cliente excluído.");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="barbeiros" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <form
              className="panel-lux h-fit space-y-4 rounded-2xl p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  barberForm.name.trim().length < 3 ||
                  barberForm.specialty.trim().length < 3 ||
                  onlyDigits(barberForm.whatsapp).length < 10
                ) {
                  toast.error("Preencha todos os campos corretamente.");
                  return;
                }
                addBarber({
                  name: barberForm.name.trim(),
                  specialty: barberForm.specialty.trim(),
                  whatsapp: barberForm.whatsapp,
                });
                setBarberForm({ name: "", specialty: "", whatsapp: "" });
                toast.success("Barbeiro adicionado.");
              }}
            >
              <h2 className="text-lg">Novo barbeiro</h2>
              <div className="space-y-2">
                <Label htmlFor="ab-nome">Nome completo</Label>
                <Input
                  id="ab-nome"
                  value={barberForm.name}
                  onChange={(e) =>
                    setBarberForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ab-esp">Especialidade</Label>
                <Input
                  id="ab-esp"
                  value={barberForm.specialty}
                  onChange={(e) =>
                    setBarberForm((f) => ({ ...f, specialty: e.target.value }))
                  }
                  placeholder="Ex.: Degradê & Navalhado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ab-zap">WhatsApp comercial</Label>
                <Input
                  id="ab-zap"
                  value={barberForm.whatsapp}
                  onChange={(e) =>
                    setBarberForm((f) => ({
                      ...f,
                      whatsapp: maskPhone(e.target.value),
                    }))
                  }
                  placeholder="(11) 98888-0001"
                  inputMode="tel"
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="size-4" /> Adicionar
              </Button>
            </form>

            <div className="panel-lux rounded-2xl p-5">
              <h2 className="text-lg">Equipe</h2>
              <div className="gold-rule my-4" />
              {barbers.length === 0 ? (
                <Empty text="Nenhum barbeiro cadastrado." />
              ) : (
                <ul className="space-y-2">
                  {barbers.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3"
                    >
                      <div className="flex-1">
                        <span className="block text-sm font-medium">{b.name}</span>
                        <span className="block text-xs text-gold">
                          {b.specialty}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {b.whatsapp}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Excluir ${b.name}`}
                        onClick={() => {
                          removeBarber(b.id);
                          toast.success("Barbeiro excluído.");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-lux rounded-2xl p-4 text-center">
      <span className="block text-2xl font-semibold text-gold">{value}</span>
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
