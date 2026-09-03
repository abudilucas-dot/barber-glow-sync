import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { TIME_SLOTS } from "@/lib/barber-store";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_services",
  title: "Serviços e informações da barbearia",
  description:
    "Retorna os dados de uma barbearia da plataforma: serviços com preços, horário de funcionamento, links e horários possíveis de agendamento.",
  inputSchema: {
    slug: z
      .string()
      .optional()
      .describe("Link da barbearia (ex.: navalha-de-ouro). Sem valor, usa a primeira ativa."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("barbershops").select("*").eq("status", "active");
    if (slug) query = query.eq("slug", slug);
    const { data: shop } = await query.order("created_at").limit(1).maybeSingle();

    if (!shop) {
      const payload = { error: "Barbearia não encontrada." };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(payload) }],
        structuredContent: payload,
      };
    }

    const [services, hours] = await Promise.all([
      supabase.from("shop_services").select("*").eq("shop_id", shop.id).order("sort_order"),
      supabase.from("shop_hours").select("*").eq("shop_id", shop.id).order("sort_order"),
    ]);

    const payload = {
      shop,
      services: services.data ?? [],
      hours: hours.data ?? [],
      timeSlots: TIME_SLOTS,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
