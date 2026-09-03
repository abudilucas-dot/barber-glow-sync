/** Helpers compartilhados pela plataforma de barbearias. */

export const PLATFORM = {
  name: "BarberLink",
  tagline: "A plataforma das barbearias",
  description:
    "Crie a página da sua barbearia em minutos: link próprio, tabela de preços, equipe e agendamento pelo WhatsApp.",
};

/** Limites do plano gratuito. O plano Pro libera tudo. */
export const FREE_LIMITS = {
  services: 4,
  barbers: 1,
  shops: 1,
};

export const TIME_SLOTS = Array.from({ length: 10 }, (_, i) =>
  `${String(9 + i).padStart(2, "0")}:00`,
);

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function nextDays(count = 7) {
  const out: { iso: string; weekday: string; day: string; month: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
      weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      day: String(d.getDate()).padStart(2, "0"),
      month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    });
  }
  return out;
}

export function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function waLink(phone: string, message: string) {
  const digits = onlyDigits(phone);
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

export function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
