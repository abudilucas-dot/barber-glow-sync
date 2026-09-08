import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, Scissors, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatBR,
  formatDuration,
  maskPhone,
  nextDays,
  onlyDigits,
  waLink,
} from "@/lib/barber-store";
import type { Barber, Shop, ShopService } from "@/lib/shop-store";
import { cn } from "@/lib/utils";

const STEPS = ["Serviço", "Profissional", "Data e horário", "Seus dados", "Confirmação"] as const;
type Slot = { barberId: string; startTime: string; endTime: string };
type SavedClient = { name: string; phone: string };

const storageKey = (slug: string) => `barberlink:cliente:${slug}`;

export function BookingFlow({
  shop,
  services,
  barbers,
  initialServiceId,
  getAvailableSlots,
  onBook,
}: {
  shop: Shop;
  services: ShopService[];
  barbers: Barber[];
  initialServiceId?: string;
  getAvailableSlots: (serviceId: string, date: string, barberId?: string | null) => Promise<Slot[]>;
  onBook: (input: {
    name: string;
    whatsapp: string;
    serviceId: string;
    barberId: string | null;
    date: string;
    startTime: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const days = useMemo(() => nextDays(14), []);
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState(days[0]?.iso ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const service = services.find((item) => item.id === serviceId) ?? null;
  const professional =
    barbers.find((item) => item.id === (selectedSlot?.barberId ?? barberId)) ?? null;

  useEffect(() => {
    if (initialServiceId && services.some((item) => item.id === initialServiceId)) {
      setServiceId(initialServiceId);
      setStep(1);
    }
  }, [initialServiceId, services]);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(storageKey(shop.slug)) ?? "null",
      ) as SavedClient | null;
      if (stored?.name && stored.phone) {
        setName(stored.name);
        setPhone(stored.phone);
      }
    } catch {
      /* local data is optional */
    }
  }, [shop.slug]);

  useEffect(() => {
    if (step !== 2 || !serviceId) return undefined;
    let mounted = true;
    setLoadingSlots(true);
    setSelectedSlot(null);
    void getAvailableSlots(serviceId, date, barberId).then((items) => {
      if (mounted) {
        setSlots(items);
        setLoadingSlots(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [barberId, date, getAvailableSlots, serviceId, step]);

  function next(target: number) {
    if (target === 1 && !service) {
      toast.error("Escolha um serviço.");
      return;
    }
    if (target === 2 && barbers.filter((item) => item.active).length === 0) {
      toast.error("Nenhum profissional disponível.");
      return;
    }
    if (target === 3 && !selectedSlot) {
      toast.error("Escolha um horário.");
      return;
    }
    setStep(target);
  }

  async function confirm() {
    if (!service || !selectedSlot || !professional) return;
    if (name.trim().length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (onlyDigits(phone).length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (!privacyAccepted) {
      toast.error("Confirme o uso dos seus dados para concluir o agendamento.");
      return;
    }
    setSending(true);
    const result = await onBook({
      name: name.trim(),
      whatsapp: phone,
      serviceId: service.id,
      barberId: selectedSlot.barberId,
      date,
      startTime: selectedSlot.startTime,
    });
    setSending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível concluir a reserva.");
      return;
    }
    try {
      localStorage.setItem(
        storageKey(shop.slug),
        JSON.stringify({ name: name.trim(), phone } satisfies SavedClient),
      );
    } catch {
      /* optional */
    }
    setStep(4);
    toast.success("Agendamento confirmado!");
  }

  return (
    <div className="panel-lux rounded-2xl p-5 sm:p-7">
      <div className="mb-3 flex justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Passo {step + 1} de 5</span>
        <span className="text-gold">{STEPS[step]}</span>
      </div>
      <div className="mb-7 h-1 overflow-hidden rounded bg-border">
        <div className="h-full bg-gold" style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>
      {step === 0 && (
        <section className="space-y-4">
          <Title icon={<Scissors className="size-4" />} text="Escolha o serviço" />
          <div className="grid gap-2 sm:grid-cols-2">
            {services
              .filter((item) => item.active)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setServiceId(item.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left",
                    serviceId === item.id
                      ? "border-gold bg-accent"
                      : "border-border bg-surface-2/40 hover:border-gold/50",
                  )}
                >
                  <strong>{item.name}</strong>
                  {item.description && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                  <span className="mt-3 block text-sm text-gold">
                    R$ {item.price} · {formatDuration(item.durationMinutes)}
                  </span>
                </button>
              ))}
          </div>
          <Button size="lg" className="w-full" onClick={() => next(1)}>
            Continuar
          </Button>
        </section>
      )}
      {step === 1 && (
        <section className="space-y-4">
          <Title icon={<User className="size-4" />} text="Escolha o profissional" />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBarberId(null)}
              className={cn(
                "rounded-xl border p-4 text-left",
                barberId === null ? "border-gold bg-accent" : "border-border bg-surface-2/40",
              )}
            >
              <strong>Qualquer profissional</strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                Primeiro horário compatível.
              </span>
            </button>
            {barbers
              .filter((item) => item.active)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBarberId(item.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left",
                    barberId === item.id
                      ? "border-gold bg-accent"
                      : "border-border bg-surface-2/40",
                  )}
                >
                  <strong>{item.name}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.specialty}</span>
                </button>
              ))}
          </div>
          <Actions back={() => setStep(0)} next={() => next(2)} />
        </section>
      )}
      {step === 2 && (
        <section className="space-y-5">
          <Title icon={<CalendarDays className="size-4" />} text="Data e horário" />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((item, index) => (
              <button
                key={item.iso}
                type="button"
                onClick={() => setDate(item.iso)}
                className={cn(
                  "rounded-xl border py-2 text-center",
                  date === item.iso
                    ? "border-gold bg-accent text-gold"
                    : "border-border bg-surface-2/40",
                )}
              >
                <span className="block text-[10px] uppercase">
                  {index === 0 ? "hoje" : item.weekday}
                </span>
                <span className="block text-lg font-semibold">{item.day}</span>
              </button>
            ))}
          </div>
          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">Calculando horários…</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              Não há horários compatíveis nesta data.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((slot) => (
                <button
                  key={`${slot.barberId}-${slot.startTime}`}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-xl border px-2 py-3",
                    selectedSlot?.barberId === slot.barberId &&
                      selectedSlot.startTime === slot.startTime
                      ? "border-gold bg-accent text-gold"
                      : "border-border bg-surface-2/40",
                  )}
                >
                  <strong>{slot.startTime.slice(0, 5)}</strong>
                  {barberId === null && (
                    <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                      {barbers.find((item) => item.id === slot.barberId)?.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <Actions back={() => setStep(1)} next={() => next(3)} />
        </section>
      )}
      {step === 3 && (
        <section className="space-y-5">
          <Title icon={<User className="size-4" />} text="Seus dados" />
          <div className="space-y-2">
            <Label htmlFor="booking-name">Nome completo</Label>
            <Input
              id="booking-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-phone">WhatsApp</Label>
            <Input
              id="booking-phone"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-sm">
            <Summary label="Barbearia" value={shop.name} />
            <Summary label="Serviço" value={service?.name ?? "-"} />
            <Summary label="Profissional" value={professional?.name ?? "-"} />
            <Summary label="Data" value={formatBR(date)} />
            <Summary label="Horário" value={selectedSlot?.startTime.slice(0, 5) ?? "-"} />
            <Summary
              label="Duração"
              value={service ? formatDuration(service.durationMinutes) : "-"}
            />
            <Summary label="Preço" value={service ? `R$ ${service.price}` : "-"} />
          </div>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-border p-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(event) => setPrivacyAccepted(event.target.checked)}
              className="mt-0.5 size-4 accent-yellow-500"
            />
            <span>
              Autorizo o uso do meu nome e WhatsApp para registrar este agendamento e receber
              comunicações relacionadas a ele, conforme a{" "}
              <a href="/privacidade" className="text-gold hover:underline">
                Política de Privacidade
              </a>
              .
            </span>
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setStep(2)} className="sm:w-40">
              <ChevronLeft className="size-4" /> Voltar
            </Button>
            <Button size="lg" disabled={sending} onClick={() => void confirm()} className="flex-1">
              {sending ? "Confirmando…" : "Confirmar agendamento"}
            </Button>
          </div>
        </section>
      )}
      {step === 4 && (
        <section className="space-y-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold text-gold">
            <Check className="size-7" />
          </div>
          <div>
            <h3 className="text-2xl text-gilded">Agendamento confirmado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua reserva foi registrada na agenda da barbearia.
            </p>
          </div>
          {shop.ownerWhatsapp && (
            <Button asChild variant="outline">
              <a
                href={waLink(
                  shop.ownerWhatsapp,
                  `Olá! Tenho um agendamento na ${shop.name} para ${formatBR(date)} às ${selectedSlot?.startTime.slice(0, 5)}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com a barbearia
              </a>
            </Button>
          )}
          <button
            type="button"
            className="block w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
            onClick={() => {
              setStep(0);
              setSelectedSlot(null);
            }}
          >
            Novo agendamento
          </button>
        </section>
      )}
    </div>
  );
}

function Title({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-gold">
      {icon}
      <h3 className="text-xs uppercase tracking-[0.25em]">{text}</h3>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function Actions({ back, next }: { back: () => void; next: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row">
      <Button variant="outline" onClick={back} className="sm:w-40">
        <ChevronLeft className="size-4" /> Voltar
      </Button>
      <Button size="lg" onClick={next} className="flex-1">
        Continuar
      </Button>
    </div>
  );
}
