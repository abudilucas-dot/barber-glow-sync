import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Clock,
  Scissors,
  User,
  CalendarDays,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SERVICES,
  SHOP,
  TIME_SLOTS,
  formatBR,
  maskPhone,
  nextDays,
  onlyDigits,
  useBarbershop,
  waLink,
  type Barber,
} from "@/lib/barber-store";
import { cn } from "@/lib/utils";

const STEPS = ["Identificação", "Agendamento", "Confirmação"] as const;

export function BookingFlow() {
  const {
    barbers,
    addClient,
    addAppointment,
    isSlotTaken,
  } = useBarbershop();

  const days = useMemo(() => nextDays(7), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>("");
  const [barber, setBarber] = useState<Barber | null>(null);
  const [date, setDate] = useState(days[0]?.iso ?? "");
  const [time, setTime] = useState("");

  function submitIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (onlyDigits(phone).length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    setStep(1);
  }

  async function confirm() {
    if (!service) {
      toast.error("Escolha um serviço.");
      return;
    }
    if (!barber) {
      toast.error("Escolha um barbeiro.");
      return;
    }
    if (!date) {
      toast.error("Escolha um dia.");
      return;
    }
    if (!time) {
      toast.error("Escolha um horário.");
      return;
    }

    const client = await addClient(name.trim(), phone);
    if (!client) {
      toast.error("Não foi possível salvar seu cadastro. Tente novamente.");
      return;
    }
    const ok = await addAppointment({
      clientId: client.id,
      barberId: barber.id,
      service,
      date,
      time,
    });
    if (!ok) {
      toast.error("Esse horário acabou de ser ocupado. Escolha outro.");
      return;
    }

    const message = `Olá ${barber.name}! Sou o(a) ${client.name}. Agendei o serviço ${service} para o dia ${formatBR(date)} às ${time}.`;
    window.open(waLink(barber.whatsapp, message), "_blank", "noopener");
    setStep(2);
    toast.success("Agendamento confirmado!");
  }

  function reset() {
    setStep(0);
    setName("");
    setPhone("");
    setService("");
    setBarber(null);
    setDate(days[0]?.iso ?? "");
    setTime("");
  }

  return (
    <div className="panel-lux rounded-2xl p-5 sm:p-7">
      <ol className="mb-7 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-gold bg-gold text-primary-foreground",
                i === step && "border-gold text-gold",
                i > step && "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden sm:inline",
                i === step ? "text-gold" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="gold-rule flex-1" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={submitIdentity} className="space-y-5">
          <div>
            <h3 className="text-xl">Vamos começar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Precisamos do seu nome e WhatsApp para reservar a cadeira.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-nome">Nome completo</Label>
            <Input
              id="cli-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: João Pedro Silva"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-zap">WhatsApp</Label>
            <Input
              id="cli-zap"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(11) 99999-0000"
              inputMode="tel"
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Continuar
          </Button>
        </form>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <section className="space-y-3">
            <SectionTitle icon={<Scissors className="size-4" />} title="Serviço" />
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setService(s.name)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    service === s.name
                      ? "border-gold bg-accent text-gold"
                      : "border-border bg-surface-2/40 hover:border-gold/50",
                  )}
                >
                  <span>{s.name}</span>
                  <span className="font-semibold">R$ {s.price}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<User className="size-4" />} title="Barbeiro" />
            {barbers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum barbeiro cadastrado. Cadastre a equipe no painel de gestão.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {barbers.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBarber(b);
                      setTime("");
                    }}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      barber?.id === b.id
                        ? "border-gold bg-accent"
                        : "border-border bg-surface-2/40 hover:border-gold/50",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        barber?.id === b.id && "text-gold",
                      )}
                    >
                      {b.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {b.specialty}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<CalendarDays className="size-4" />}
              title="Dia"
            />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {days.map((d, i) => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    setDate(d.iso);
                    setTime("");
                  }}
                  className={cn(
                    "rounded-xl border py-2.5 text-center transition-colors",
                    date === d.iso
                      ? "border-gold bg-accent text-gold"
                      : "border-border bg-surface-2/40 hover:border-gold/50",
                  )}
                >
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                    {i === 0 ? "hoje" : d.weekday}
                  </span>
                  <span className="block text-lg font-semibold">{d.day}</span>
                  <span className="block text-[10px] uppercase text-muted-foreground">
                    {d.month}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<Clock className="size-4" />} title="Horário" />
            {!barber ? (
              <p className="text-sm text-muted-foreground">
                Selecione um barbeiro para ver os horários livres.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {TIME_SLOTS.map((slot) => {
                  const taken = isSlotTaken(barber.id, date, slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={taken}
                      onClick={() => setTime(slot)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center text-sm transition-colors",
                        taken &&
                          "cursor-not-allowed border-destructive/60 bg-destructive/20 text-destructive-foreground/70",
                        !taken && time === slot && "border-gold bg-accent text-gold",
                        !taken &&
                          time !== slot &&
                          "border-border bg-surface-2/40 hover:border-gold/50",
                      )}
                    >
                      <span className="block font-semibold">{slot}</span>
                      <span className="block text-[10px] uppercase tracking-wider">
                        {taken ? "Ocupado" : "Livre"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setStep(0)} className="sm:w-40">
              <ChevronLeft className="size-4" /> Voltar
            </Button>
            <Button size="lg" onClick={confirm} className="flex-1">
              Confirmar e enviar no WhatsApp
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold text-gold">
            <Check className="size-7" />
          </div>
          <div>
            <h3 className="text-2xl text-gilded">Horário reservado!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Abrimos o WhatsApp de {barber?.name} com sua mensagem. Caso a janela
              tenha sido bloqueada, use o botão abaixo.
            </p>
          </div>
          <div className="mx-auto max-w-sm space-y-2 rounded-xl border border-border bg-surface-2/40 p-4 text-left text-sm">
            <Row label="Cliente" value={name} />
            <Row label="Serviço" value={service} />
            <Row label="Barbeiro" value={barber?.name ?? "-"} />
            <Row label="Data" value={formatBR(date)} />
            <Row label="Horário" value={time} />
            <Row label="Local" value={SHOP.name} />
          </div>
          {barber && (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a
                href={waLink(
                  barber.whatsapp,
                  `Olá ${barber.name}! Sou o(a) ${name}. Agendei o serviço ${service} para o dia ${formatBR(date)} às ${time}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Reabrir WhatsApp do barbeiro
              </a>
            </Button>
          )}
          <button
            type="button"
            onClick={reset}
            className="block w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
          >
            Fazer novo agendamento
          </button>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-gold">
      {icon}
      <h4 className="text-xs uppercase tracking-[0.25em]">{title}</h4>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
