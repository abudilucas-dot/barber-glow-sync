import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Remove agendamentos com data anterior à data de hoje (requer login). */
export async function purgePastAppointments() {
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .lt("date", todayISO())
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
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

/** Hook central de dados — lê e grava no banco da barbearia. */
export function useBarbershop() {
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const signedIn = Boolean(sessionData.session);

    const barbersRes = await supabase
      .from("barbers")
      .select("*")
      .order("created_at");
    setBarbers(
      (barbersRes.data ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        specialty: b.specialty,
        whatsapp: b.whatsapp,
      })),
    );

    if (signedIn) {
      const [apptRes, clientsRes] = await Promise.all([
        supabase.from("appointments").select("*").order("date").order("time"),
        supabase.from("clients").select("*").order("created_at"),
      ]);
      setAppointments(
        (apptRes.data ?? []).map((a) => ({
          id: a.id,
          clientId: a.client_id,
          barberId: a.barber_id,
          service: a.service,
          date: a.date,
          time: a.time,
        })),
      );
      setClients(
        (clientsRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          whatsapp: c.whatsapp,
        })),
      );
    } else {
      // Visitantes veem apenas a disponibilidade (sem dados de clientes).
      const { data } = await supabase.rpc("get_booked_slots");
      setAppointments(
        (data ?? []).map((s, i) => ({
          id: `slot-${i}`,
          clientId: "",
          barberId: s.barber_id,
          service: "",
          date: s.date,
          time: s.time,
        })),
      );
      setClients([]);
    }
    setReady(true);
  }, []);


  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addClient = useCallback(
    async (name: string, whatsapp: string): Promise<Client | null> => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ name, whatsapp })
        .select()
        .single();
      if (error || !data) return null;
      void refresh();
      return { id: data.id, name: data.name, whatsapp: data.whatsapp };
    },
    [refresh],
  );

  const removeClient = useCallback(
    async (id: string) => {
      await supabase.from("clients").delete().eq("id", id);
      void refresh();
    },
    [refresh],
  );

  const addBarber = useCallback(
    async (barber: Omit<Barber, "id">) => {
      await supabase.from("barbers").insert({
        name: barber.name,
        specialty: barber.specialty,
        whatsapp: barber.whatsapp,
      });
      void refresh();
    },
    [refresh],
  );

  const removeBarber = useCallback(
    async (id: string) => {
      await supabase.from("barbers").delete().eq("id", id);
      void refresh();
    },
    [refresh],
  );

  const addAppointment = useCallback(
    async (data: Omit<Appointment, "id">) => {
      const { error } = await supabase.from("appointments").insert({
        client_id: data.clientId,
        barber_id: data.barberId,
        service: data.service,
        date: data.date,
        time: data.time,
      });
      void refresh();
      return !error;
    },
    [refresh],
  );

  const removeAppointment = useCallback(
    async (id: string) => {
      await supabase.from("appointments").delete().eq("id", id);
      void refresh();
    },
    [refresh],
  );

  const isSlotTaken = useCallback(
    (barberId: string, date: string, time: string) =>
      appointments.some(
        (a) => a.barberId === barberId && a.date === date && a.time === time,
      ),
    [appointments],
  );

  const purge = useCallback(async () => {
    const n = await purgePastAppointments();
    void refresh();
    return n;
  }, [refresh]);

  return {
    ready,
    clients,
    barbers,
    appointments,
    refresh,
    addClient,
    removeClient,
    addBarber,
    removeBarber,
    addAppointment,
    removeAppointment,
    isSlotTaken,
    purgePastAppointments: purge,
  };
}
