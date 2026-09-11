import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { formatDuration, todayISO } from "@/lib/barber-store";

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
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  state: string | null;
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
  durationMinutes: number;
  description: string;
  active: boolean;
  sortOrder: number;
};

export type ShopHour = { id: string; days: string; hours: string; sortOrder: number };

export type Barber = {
  id: string;
  name: string;
  specialty: string;
  whatsapp: string;
  photoUrl: string | null;
  bio: string;
  active: boolean;
};
export type Client = { id: string; name: string; whatsapp: string };
export type Appointment = {
  id: string;
  clientId: string;
  barberId: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type ShopRow = {
  id: string;
  owner_id?: string | null;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  hero_url: string | null;
  instagram_url: string | null;
  maps_url: string | null;
  owner_whatsapp?: string | null;
  primary_color: string;
  plan: string;
  status: string;
  trial_ends_at: string;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  state: string | null;
};

export function mapShop(r: ShopRow): Shop {
  return {
    id: r.id,
    ownerId: r.owner_id ?? "",
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    about: r.about,
    heroUrl: r.hero_url,
    instagramUrl: r.instagram_url,
    mapsUrl: r.maps_url,
    ownerWhatsapp: r.owner_whatsapp ?? "",
    primaryColor: r.primary_color,
    plan: r.plan,
    status: r.status,
    trialEndsAt: r.trial_ends_at,
    city: r.city,
    neighborhood: r.neighborhood,
    address: r.address,
    state: r.state,
  };
}

// This view intentionally omits private owner data from anonymous visitors.
// It has the same public shape used by ShopRow, so the browser never queries
// the private barbershops table for the directory or public pages.
/** Vitrine pública: todas as barbearias ativas da plataforma. */
export function useShopDirectory() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("get_public_shops");
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
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data: shopRows } = await supabase.rpc("get_public_shop", { _slug: slug });
    const shopRow = shopRows?.[0];
    if (!shopRow) {
      setShop(null);
      setReady(true);
      return;
    }
    const s = mapShop(shopRow as ShopRow);
    setShop(s);

    const [svc, hrs, brb] = await Promise.all([
      supabase
        .from("shop_services")
        .select("*")
        .eq("shop_id", s.id)
        .eq("active", true)
        .order("sort_order"),
      supabase.from("shop_hours").select("*").eq("shop_id", s.id).order("sort_order"),
      supabase
        .from("barbers")
        .select("*")
        .eq("shop_id", s.id)
        .eq("active", true)
        .order("created_at"),
    ]);

    setServices(
      (svc.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        duration: r.duration,
        durationMinutes: r.duration_minutes,
        description: r.description,
        active: r.active,
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
        photoUrl: b.photo_url,
        bio: b.bio,
        active: b.active,
      })),
    );
    setReady(true);
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getAvailableSlots = useCallback(
    async (serviceId: string, date: string, barberId?: string | null) => {
      if (!shop) return [] as { barberId: string; startTime: string; endTime: string }[];
      const args: { _shop_id: string; _service_id: string; _date: string; _barber_id?: string } = {
        _shop_id: shop.id,
        _service_id: serviceId,
        _date: date,
      };
      if (barberId) args._barber_id = barberId;
      const { data, error } = await supabase.rpc("get_available_slots", args);
      if (error) return [];
      return (data ?? []).map((slot) => ({
        barberId: slot.barber_id,
        startTime: slot.start_time,
        endTime: slot.end_time,
      }));
    },
    [shop],
  );

  const createBooking = useCallback(
    async (input: {
      name: string;
      whatsapp: string;
      barberId: string | null;
      serviceId: string;
      date: string;
      startTime: string;
    }) => {
      if (!shop) return { ok: false as const, error: "Barbearia não encontrada." };
      const { data, error } = await supabase.rpc("create_booking", {
        _shop_id: shop.id,
        _service_id: input.serviceId,
        _barber_id: input.barberId ?? "00000000-0000-0000-0000-000000000000",
        _date: input.date,
        _start_time: input.startTime,
        _client_name: input.name,
        _client_phone: input.whatsapp,
      });
      if (error || !data?.[0]) {
        return {
          ok: false as const,
          error: error?.message ?? "Não foi possível concluir a reserva.",
        };
      }
      await refresh();
      return { ok: true as const, booking: data[0] };
    },
    [shop, refresh],
  );

  return {
    shop,
    services,
    hours,
    barbers,
    ready,
    getAvailableSlots,
    createBooking,
    refresh,
  };
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
          error:
            error?.code === "23505"
              ? "Esse link já está em uso."
              : error?.code === "PGRST205"
                ? "O banco de dados ainda não foi configurado. Aplique as migrações do projeto e tente novamente."
                : "Não foi possível criar.",
        };
      }
      await supabase.rpc("initialize_shop_schedule", { _shop_id: data.id });
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
        durationMinutes: r.duration_minutes,
        description: r.description,
        active: r.active,
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
        photoUrl: b.photo_url,
        bio: b.bio,
        active: b.active,
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
        status: a.status as Appointment["status"],
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
      if (!shopId || !shop) return false;
      const { error } = await supabase.rpc("update_shop_profile", {
        _shop_id: shopId,
        _name: patch.name ?? shop.name,
        _slug: patch.slug ?? shop.slug,
        _tagline: patch.tagline ?? shop.tagline,
        _about: patch.about ?? shop.about,
        _hero_url: patch.hero_url ?? shop.heroUrl ?? "",
        _instagram_url: patch.instagram_url ?? shop.instagramUrl ?? "",
        _maps_url: patch.maps_url ?? shop.mapsUrl ?? "",
        _owner_whatsapp: patch.owner_whatsapp ?? shop.ownerWhatsapp,
      });
      await refresh();
      return !error;
    },
    [shopId, shop, refresh],
  );

  const addService = useCallback(
    async (input: { name: string; price: number; duration: string }) => {
      if (!shopId) return false;
      const numericDuration = Number(input.duration.match(/\d+/)?.[0] ?? 30);
      const { error } = await supabase.from("shop_services").insert({
        shop_id: shopId,
        name: input.name,
        price: input.price,
        duration: formatDuration(numericDuration),
        duration_minutes: numericDuration,
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
      const { error } = await supabase.from("shop_hours").insert({
        shop_id: shopId,
        days: input.days,
        hours: input.hours,
        sort_order: hours.length + 1,
      });
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
    async (input: Pick<Barber, "name" | "specialty" | "whatsapp">) => {
      if (!shopId) return false;
      const { data, error } = await supabase
        .from("barbers")
        .insert({ shop_id: shopId, ...input })
        .select("id")
        .maybeSingle();
      if (!error && data) await supabase.rpc("initialize_barber_schedule", { _barber_id: data.id });
      await refresh();
      return !error;
    },
    [shopId, refresh],
  );

  const updateBarber = useCallback(
    async (id: string, patch: { name?: string; specialty?: string; whatsapp?: string }) => {
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

  const cancelAppointment = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("cancel_appointment", { _appointment_id: id });
      await refresh();
      return !error;
    },
    [refresh],
  );

  const purgePastAppointments = useCallback(async () => {
    if (!shopId) return 0;
    const { data } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("shop_id", shopId)
      .lt("date", todayISO())
      .neq("status", "cancelled")
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
    cancelAppointment,
    purgePastAppointments,
  };
}
