import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM } from "@/lib/barber-store";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Recuperar senha — ${PLATFORM.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PasswordRecoveryPage,
});

function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível solicitar a redefinição. Tente novamente mais tarde.");
      return;
    }
    toast.success(
      "Se houver uma conta com esse e-mail, enviamos as instruções para redefinir a senha.",
    );
  }
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <section className="panel-lux rounded-2xl p-6 sm:p-8">
        <Link
          to="/auth"
          search={{ next: "/admin" }}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="size-3.5" /> Voltar ao acesso
        </Link>
        <h1 className="mt-5 flex items-center gap-2 text-2xl text-gilded">
          <KeyRound className="size-5 text-gold" /> Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviaremos um link seguro para você definir uma nova senha.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button className="w-full" disabled={busy}>
            {busy ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
      </section>
    </main>
  );
}
