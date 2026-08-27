import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_appointments",
  title: "Listar agendamentos",
  description:
    "Lista os agendamentos da agenda com cliente, barbeiro, serviço, data e horário. Aceita filtros opcionais por data e barbeiro.",
  inputSchema: {
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Data inicial (YYYY-MM-DD)."),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Data final (YYYY-MM-DD)."),
    barber_id: z.string().uuid().optional().describe("ID do barbeiro."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, barber_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("appointments")
      .select(
        "id, service, date, time, barbers(id, name), clients(id, name, whatsapp)",
      )
      .order("date")
      .order("time");
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (barber_id) query = query.eq("barber_id", barber_id);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
