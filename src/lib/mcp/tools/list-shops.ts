import { defineTool } from "@lovable.dev/mcp-js";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_shops",
  title: "Listar barbearias da plataforma",
  description:
    "Lista as barbearias visíveis para o usuário com slug, link público, plano (teste ou pro), status e fim do período de teste.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("barbershops")
      .select("id, name, slug, tagline, plan, status, trial_ends_at")
      .order("created_at");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const shops = (data ?? []).map((s: any) => ({
      ...s,
      link: `/${s.slug}`,
      live:
        s.status === "active" &&
        (s.plan === "pro" || new Date(s.trial_ends_at).getTime() > Date.now()),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(shops) }],
      structuredContent: { shops },
    };
  },
});
