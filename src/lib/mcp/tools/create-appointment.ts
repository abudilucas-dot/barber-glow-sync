import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_appointment",
  title: "Criar agendamento",
  description:
    "Cadastra o cliente (se necessário) e cria um agendamento para um barbeiro em uma data e horário livres.",
  inputSchema: {
    client_name: z.string().trim().min(2).describe("Nome completo do cliente."),
    client_whatsapp: z
      .string()
      .trim()
      .min(8)
      .describe("WhatsApp do cliente com DDD."),
    barber_id: z.string().uuid().describe("ID do barbeiro (use list_barbers)."),
    service: z.string().trim().min(2).describe("Serviço escolhido."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Data no formato YYYY-MM-DD."),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .describe("Horário no formato HH:mm, das 09:00 às 18:00."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({ name: input.client_name, whatsapp: input.client_whatsapp })
      .select("id, name, whatsapp")
      .single();
    if (clientError || !client) {
      return {
        content: [
          { type: "text", text: clientError?.message ?? "Falha ao salvar cliente." },
        ],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_id: client.id,
        barber_id: input.barber_id,
        service: input.service,
        date: input.date,
        time: input.time,
      })
      .select("id, service, date, time, barber_id, client_id")
      .single();
    if (error) {
      return {
        content: [
          {
            type: "text",
            text: `Não foi possível agendar: ${error.message}. O horário pode já estar ocupado.`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ appointment: data, client }) }],
      structuredContent: { appointment: data, client },
    };
  },
});
