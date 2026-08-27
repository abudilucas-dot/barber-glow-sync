import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "cancel_appointment",
  title: "Cancelar agendamento",
  description: "Cancela (exclui) um agendamento da agenda pelo seu ID.",
  inputSchema: {
    appointment_id: z.string().uuid().describe("ID do agendamento a cancelar."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ appointment_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointment_id)
      .select("id");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data?.length) {
      return {
        content: [{ type: "text", text: "Agendamento não encontrado." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Agendamento ${appointment_id} cancelado.` }],
      structuredContent: { cancelled: appointment_id },
    };
  },
});
