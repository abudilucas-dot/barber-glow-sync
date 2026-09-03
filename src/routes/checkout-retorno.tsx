import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout-retorno")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search['session_id'] === "string" ? { session_id: search['session_id'] } : {},
  head: () => ({
    meta: [
      { title: "Assinatura confirmada — BarberLink" },
      {
        name: "description",
        content: "Sua assinatura BarberLink Pro foi processada e sua página segue no ar.",
      },
      { property: "og:title", content: "Assinatura confirmada — BarberLink" },
      {
        property: "og:description",
        content: "Pagamento concluído: gerencie sua barbearia pelo painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-16 text-center sm:px-6">
      <CheckCircle2 className="mx-auto size-12 text-gold" />
      <h1 className="mt-5 text-3xl text-gilded">
        {sessionId ? "Pagamento concluído" : "Checkout encerrado"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {sessionId
          ? "Assim que a confirmação chegar, sua barbearia fica no plano Pro e a página segue no ar."
          : "Não recebemos os dados do pagamento. Você pode tentar novamente pelos planos."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link to="/admin">Ir para o painel</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/precos">Ver planos</Link>
        </Button>
      </div>
    </main>
  );
}
