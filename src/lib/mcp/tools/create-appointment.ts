import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_appointment",
  title: "Criar agendamento",
  description:
    "Cria uma reserva validada pela agenda da barbearia; conflitos, duração e expediente são verificados no banco.",
  inputSchema: {
    shop_id: z.string().uuid().describe("ID da barbearia."),
    service_id: z.string().uuid().describe("ID do serviço (use list_services)."),
    barber_id: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .describe("ID do barbeiro; omita para qualquer profissional."),
    client_name: z.string().trim().min(2).describe("Nome completo do cliente."),
    client_whatsapp: z.string().trim().min(8).describe("WhatsApp do cliente com DDD."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Data YYYY-MM-DD."),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .describe("Horário HH:mm."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .rpc("create_booking", {
        _shop_id: input.shop_id,
        _service_id: input.service_id,
        _barber_id: input.barber_id ?? null,
        _date: input.date,
        _start_time: input.time,
        _client_name: input.client_name,
        _client_phone: input.client_whatsapp,
      })
      .single();
    if (error || !data) {
      return {
        content: [
          { type: "text", text: error?.message ?? "Não foi possível criar o agendamento." },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ appointment: data }) }],
      structuredContent: { appointment: data },
    };
  },
});
