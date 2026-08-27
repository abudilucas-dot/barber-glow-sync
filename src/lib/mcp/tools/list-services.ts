import { defineTool } from "@lovable.dev/mcp-js";
import { SERVICES, SHOP, TIME_SLOTS } from "@/lib/barber-store";

export default defineTool({
  name: "list_services",
  title: "Serviços e informações da loja",
  description:
    "Retorna a tabela de serviços com preços, o horário de funcionamento, os links da barbearia e os horários disponíveis por dia.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      shop: SHOP,
      services: SERVICES,
      timeSlots: TIME_SLOTS,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
