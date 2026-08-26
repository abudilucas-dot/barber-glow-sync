import { useCallback, useEffect, useState } from "react";

export type Client = { id: string; name: string; whatsapp: string };
export type Barber = {
  id: string;
  name: string;
  specialty: string;
  whatsapp: string;
};
export type Appointment = {
  id: string;
  clientId: string;
  barberId: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
};

export type Service = { name: string; price: number; duration: string };

export const SERVICES: Service[] = [
  { name: "Corte Masculino", price: 45, duration: "40 min" },
  { name: "Barba Imperial", price: 35, duration: "30 min" },
  { name: "Combo (Corte + Barba)", price: 70, duration: "1h 10min" },
  { name: "Corte Infantil", price: 40, duration: "30 min" },
  { name: "Pigmentação / Disfarce", price: 30, duration: "25 min" },
  { name: "Sobrancelha na Navalha", price: 20, duration: "15 min" },
];

export const TIME_SLOTS = Array.from({ length: 10 }, (_, i) =>
  `${String(9 + i).padStart(2, "0")}:00`,
);

export const SHOP = {
  name: "Navalha de Ouro",
  tagline: "Barbearia & Clube do Cavalheiro",
  instagram: "https://instagram.com/navalhadeouro",
  maps: "https://maps.google.com/?q=Barbearia+Navalha+de+Ouro",
  ownerWhatsapp: "5511999990000",
  hours: [
    { days: "Segunda a Sexta", time: "09h às 19h" },
    { days: "Sábado", time: "09h às 18h" },
    { days: "Domingo", time: "Fechado" },
  ],
};

const KEYS = {
  clients: "barbearia.clients",
  barbers: "barbearia.barbers",
  appointments: "barbearia.appointments",
} as const;

const SEED_BARBERS: Barber[] = [
  {
    id: "b1",
    name: "Rafael Moretti",
    specialty: "Degradê & Navalhado",
    whatsapp: "5511988880001",
  },
  {
    id: "b2",
    name: "Caio Bastos",
    specialty: "Barba Terapia & Toalha Quente",
    whatsapp: "5511988880002",
  },
  {
    id: "b3",
    name: "Diego Almeida",
    specialty: "Cortes Clássicos & Pompadour",
    whatsapp: "5511988880003",
  },
];

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("barbearia:update"));
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Remove agendamentos com data anterior à data de hoje. */
export function purgePastAppointments() {
  const today = todayISO();
  const all = read<Appointment[]>(KEYS.appointments, []);
  const kept = all.filter((a) => a.date >= today);
  if (kept.length !== all.length) write(KEYS.appointments, kept);
  return all.length - kept.length;
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

/** Hook central de dados — sincroniza entre abas e componentes. */
export function useBarbershop() {
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setClients(read<Client[]>(KEYS.clients, []));
    setBarbers(read<Barber[]>(KEYS.barbers, []));
    setAppointments(read<Appointment[]>(KEYS.appointments, []));
  }, []);

  useEffect(() => {
    if (!window.localStorage.getItem(KEYS.barbers)) {
      window.localStorage.setItem(KEYS.barbers, JSON.stringify(SEED_BARBERS));
    }
    purgePastAppointments();
    refresh();
    setReady(true);
    const handler = () => refresh();
    window.addEventListener("barbearia:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("barbearia:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const addClient = useCallback((name: string, whatsapp: string) => {
    const list = read<Client[]>(KEYS.clients, []);
    const digits = onlyDigits(whatsapp);
    const existing = list.find((c) => onlyDigits(c.whatsapp) === digits);
    if (existing) {
      const updated = list.map((c) =>
        c.id === existing.id ? { ...c, name } : c,
      );
      write(KEYS.clients, updated);
      return { ...existing, name };
    }
    const client: Client = { id: uid(), name, whatsapp };
    write(KEYS.clients, [...list, client]);
    return client;
  }, []);

  const removeClient = useCallback((id: string) => {
    write(
      KEYS.clients,
      read<Client[]>(KEYS.clients, []).filter((c) => c.id !== id),
    );
    write(
      KEYS.appointments,
      read<Appointment[]>(KEYS.appointments, []).filter((a) => a.clientId !== id),
    );
  }, []);

  const addBarber = useCallback((barber: Omit<Barber, "id">) => {
    const created: Barber = { id: uid(), ...barber };
    write(KEYS.barbers, [...read<Barber[]>(KEYS.barbers, []), created]);
    return created;
  }, []);

  const removeBarber = useCallback((id: string) => {
    write(
      KEYS.barbers,
      read<Barber[]>(KEYS.barbers, []).filter((b) => b.id !== id),
    );
    write(
      KEYS.appointments,
      read<Appointment[]>(KEYS.appointments, []).filter((a) => a.barberId !== id),
    );
  }, []);

  const addAppointment = useCallback((data: Omit<Appointment, "id">) => {
    const created: Appointment = { id: uid(), ...data };
    write(KEYS.appointments, [
      ...read<Appointment[]>(KEYS.appointments, []),
      created,
    ]);
    return created;
  }, []);

  const removeAppointment = useCallback((id: string) => {
    write(
      KEYS.appointments,
      read<Appointment[]>(KEYS.appointments, []).filter((a) => a.id !== id),
    );
  }, []);

  const isSlotTaken = useCallback(
    (barberId: string, date: string, time: string) =>
      appointments.some(
        (a) => a.barberId === barberId && a.date === date && a.time === time,
      ),
    [appointments],
  );

  return {
    ready,
    clients,
    barbers,
    appointments,
    addClient,
    removeClient,
    addBarber,
    removeBarber,
    addAppointment,
    removeAppointment,
    isSlotTaken,
    purgePastAppointments,
  };
}
