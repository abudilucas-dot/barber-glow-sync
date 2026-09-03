import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { todayISO } from "@/lib/barber-store";

export type Shop = {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  heroUrl: string | null;
  instagramUrl: string | null;
  mapsUrl: string | null;
  ownerWhatsapp: string;
  primaryColor: string;
  plan: string;
  status: string;
  trialEndsAt: string;
};

/** Barbearia no ar? Pro ativo ou dentro dos 30 dias de teste. */
export function isShopLive(shop: Pick<Shop, "plan" | "status" | "trialEndsAt">) {
  return (
    shop.status === "active" &&
    (shop.plan === "pro" || new Date(shop.trialEndsAt).getTime() > Date.now())
  );
}

export function trialDaysLeft(shop: Pick<Shop, "trialEndsAt">) {
  const ms = new Date(shop.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export type ShopService = {
  id: string;
  name: string;
  price: number;
  duration: string;
  sortOrder: number;
};

export type ShopHour = { id: string; days: string; hours: string; sortOrder: number };

export type Barber = { id: string; name: string; specialty: string; whatsapp: string };
export type Client = { id: string; name: string; whatsapp: string };
export type Appointment = {
  id: string;
  clientId: string;
  barberId: string;
  service: string;
  date: string;
  time: string;
};

type ShopRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  hero_url: string | null;
  instagram_url: string | null;
  maps_url: string | null;
  owner_whatsapp: string;
  primary_color: string;
  plan: string;
  status: string;
  trial_ends_at: string;
};

export function mapShop(r: ShopRow): Shop {
  return {
    id: r.id,
    ownerId: r.owner_id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    about: r.about,
    heroUrl: r.hero_url,
    instagramUrl: r.instagram_url,
    mapsUrl: r.maps_url,
    ownerWhatsapp: r.owner_whatsapp,
    primaryColor: r.primary_color,
    plan: r.plan,
    status: r.status,
    trialEndsAt: r.trial_ends_at,
  };
}

/** Vitrine pública: todas as barbearias ativas da plataforma. */
export function useShopDirectory() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("barbershops")
        .select("*")
        .eq("status", "active")
        .order("created_at");
      setShops(((data ?? []) as ShopRow[]).map(mapShop));
      setReady(true);
    })();
  }, []);

  return { shops, ready };
}

/** Página pública de uma barbearia (por link). */
export function usePublicShop(slug: string) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<ShopService[]>([]);
  const [hours, setHours] = useState<ShopHour[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [booked, setBooked] = useState<{ barberId: string; date: string; time: string }[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data: shopRow } = await supabase
      .from("barbershops")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!shopRow) {
      setShop(null);
      setReady(true);
      return;
    }
    const s = mapShop(shopRow as ShopRow);
    setShop(s);

    const [svc, hrs, brb, slots] = await Promise.all([
      supabase.from("shop_services").select("*").eq("shop_id", s.id).order("sort_order"),
      supabase.from("shop_hours").select("*").eq("shop_id", s.id).order("sort_order"),
      supabase.from("barbers").select("*").eq("shop_id", s.id).order("created_at"),
      supabase.rpc("get_booked_slots", { _shop_id: s.id }),
    ]);

    setServices(
      (svc.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        duration: r.duration,
        sortOrder: r.sort_order,
      })),
    );
    setHours(
      (hrs.data ?? []).map((r) => ({
        id: r.id,
        days: r.days,
        hours: r.hours,
        sortOrder: r.sort_order,
      })),
    );
    setBarbers(
      (brb.data ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        specialty: b.specialty,
        whatsapp: b.whatsapp,
      })),
    );
    setBooked((slots.data ?? []).map((x) => ({ barberId: x.barber_id, date: x.date, time: x.time })));
    setReady(true);
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isSlotTaken = useCallback(
    (barberId: string, date: string, time: string) =>
      booked.some((b) => b.barberId === barberId && b.date === date && b.time === time),
    [booked],
  );

  const bookAppointment = useCallback(
    async (input: {
      name: string;
      whatsapp: string;
      barberId: string;
      service: string;
      date: string;
      time: string;
    }) => {
      if (!shop) return { ok: false as const, error: "Barbearia não encontrada." };
      const { data: clientId, error: clientErr } = await supabase.rpc("upsert_client", {
        _shop_id: shop.id,
        _name: input.name,
        _whatsapp: input.whatsapp,
      });
      if (clientErr || !clientId) {
        return { ok: false as const, error: "Não foi possível salvar seu cadastro." };
      }
      const { error } = await supabase.from("appointments").insert({
        shop_id: shop.id,
        client_id: clientId as string,
        barber_id: input.barberId,
        service: input.service,
        date: input.date,
        time: input.time,
      });
      if (error) return { ok: false as const, error: "Esse horário acabou de ser ocupado." };
      await refresh();
      return { ok: true as const, clientId: clientId as string };
    },
    [shop, refresh],
  );

  return { shop, services, hours, barbers, ready, isSlotTaken, bookAppointment, refresh };
}

/** Barbearias do dono logado. */
export function useMyShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    if (!uid) {
      setShops([]);
      setReady(true);
      return;
    }
    const { data } = await supabase
      .from("barbershops")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at");
    setShops(((data ?? []) as ShopRow[]).map(mapShop));
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createShop = useCallback(
    async (input: { name: string; slug: string; tagline: string; ownerWhatsapp: string }) => {
      if (!userId) return { ok: false as const, error: "Faça login para continuar." };
      const { data, error } = await supabase
        .from("barbershops")
        .insert({
          owner_id: userId,
          slug: input.slug,
          name: input.name,
          tagline: input.tagline,
          owner_whatsapp: input.ownerWhatsapp,
        })
        .select("*")
        .maybeSingle();
      if (error || !data) {
        return {
          ok: false as const,
          error: error?.code === "23505" ? "Esse link já está em uso." : "Não foi possível criar.",
        };
      }
      await refresh();
      return { ok: true as const, shop: mapShop(data as ShopRow) };
    },
    [userId, refresh],
  );

  return { shops, ready, userId, refresh, createShop };
}

/** Gestão completa de uma barbearia (dono logado). */
export function useShopAdmin(shopId: string | null) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<ShopService[]>([]);
  const [hours, setHours] = useState<ShopHour[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!shopId) {
      setReady(true);
      return;
    }
    const [shopRes, svc, hrs, brb, cli, apt] = await Promise.all([
      supabase.from("barbershops").select("*").eq("id", shopId).maybeSingle(),
      supabase.from("shop_services").select("*").eq("shop_id", shopId).order("sort_order"),
      supabase.from("shop_hours").select("*").eq("shop_id", shopId).order("sort_order"),
      supabase.from("barbers").select("*").eq("shop_id", shopId).order("created_at"),
      supabase.from("clients").select("*").eq("shop_id", shopId).order("created_at"),
      supabase.from("appointments").select("*").eq("shop_id", shopId).order("date").order("time"),
    ]);
    setShop(shopRes.data ? mapShop(shopRes.data as ShopRow) : null);
    setServices(
      (svc.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        duration: r.duration,
        sortOrder: r.sort_order,
      })),
    );
    setHours(
      (hrs.data ?? []).map((r) => ({
        id: r.id,
        days: r.days,
        hours: r.hours,
        sortOrder: r.sort_order,
      })),
    );
    setBarbers(
      (brb.data ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        specialty: b.specialty,
        whatsapp: b.whatsapp,
      })),
    );
    setClients((cli.data ?? []).map((c) => ({ id: c.id, name: c.name, whatsapp: c.whatsapp })));
    setAppointments(
      (apt.data ?? []).map((a) => ({
        id: a.id,
        clientId: a.client_id,
        barberId: a.barber_id,
        service: a.service,
        date: a.date,
        time: a.time,
      })),
    );
    setReady(true);
  }, [shopId]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const updateShop = useCallback(
    async (patch: TablesUpdate<"barbershops">) => {
      if (!shopId) return false;
      const { error } = await supabase.from("barbershops").update(patch).eq("id", shopId);
      await refresh();
      return !error;
    },
    [shopId, refresh],
  );

  const addService = useCallback(
    async (input: { name: string; price: number; duration: string }) => {
      if (!shopId) return false;
      const { error } = await supabase.from("shop_services").insert({
        shop_id: shopId,
        name: input.name,
        price: input.price,
        duration: input.duration,
        sort_order: services.length + 1,
      });
      await refresh();
      return !error;
    },
    [shopId, services.length, refresh],
  );

  const updateService = useCallback(
    async (id: string, patch: { name?: string; price?: number; duration?: string }) => {
      const { error } = await supabase.from("shop_services").update(patch).eq("id", id);
      await refresh();
      return !error;
    },
    [refresh],
  );

  const removeService = useCallback(
    async (id: string) => {
      await supabase.from("shop_services").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const addHour = useCallback(
    async (input: { days: string; hours: string }) => {
      if (!shopId) return false;
      const { error } = await supabase
        .from("shop_hours")
        .insert({ shop_id: shopId, days: input.days, hours: input.hours, sort_order: hours.length + 1 });
      await refresh();
      return !error;
    },
    [shopId, hours.length, refresh],
  );

  const updateHour = useCallback(
    async (id: string, patch: { days?: string; hours?: string }) => {
      const { error } = await supabase.from("shop_hours").update(patch).eq("id", id);
      await refresh();
      return !error;
    },
    [refresh],
  );

  const removeHour = useCallback(
    async (id: string) => {
      await supabase.from("shop_hours").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const addBarber = useCallback(
    async (input: Omit<Barber, "id">) => {
      if (!shopId) return false;
      const { error } = await supabase.from("barbers").insert({ shop_id: shopId, ...input });
      await refresh();
      return !error;
    },
    [shopId, refresh],
  );

  const updateBarber = useCallback(
    async (id: string, patch: Partial<Omit<Barber, "id">>) => {
      const { error } = await supabase.from("barbers").update(patch).eq("id", id);
      await refresh();
      return !error;
    },
    [refresh],
  );

  const removeBarber = useCallback(
    async (id: string) => {
      await supabase.from("barbers").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const addClient = useCallback(
    async (name: string, whatsapp: string) => {
      if (!shopId) return false;
      const { error } = await supabase.rpc("upsert_client", {
        _shop_id: shopId,
        _name: name,
        _whatsapp: whatsapp,
      });
      await refresh();
      return !error;
    },
    [shopId, refresh],
  );

  const updateClient = useCallback(
    async (id: string, patch: Partial<Omit<Client, "id">>) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      await refresh();
      return !error;
    },
    [refresh],
  );

  const removeClient = useCallback(
    async (id: string) => {
      await supabase.from("clients").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const removeAppointment = useCallback(
    async (id: string) => {
      await supabase.from("appointments").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const purgePastAppointments = useCallback(async () => {
    if (!shopId) return 0;
    const { data } = await supabase
      .from("appointments")
      .delete()
      .eq("shop_id", shopId)
      .lt("date", todayISO())
      .select("id");
    await refresh();
    return data?.length ?? 0;
  }, [shopId, refresh]);

  return {
    ready,
    shop,
    services,
    hours,
    barbers,
    clients,
    appointments,
    refresh,
    updateShop,
    addService,
    updateService,
    removeService,
    addHour,
    updateHour,
    removeHour,
    addBarber,
    updateBarber,
    removeBarber,
    addClient,
    updateClient,
    removeClient,
    removeAppointment,
    purgePastAppointments,
  };
}
