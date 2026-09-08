import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM } from "@/lib/barber-store";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Redefinir senha — ${PLATFORM.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validLink, setValidLink] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setValidLink(Boolean(data.session)));
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use pelo menos 8 caracteres na senha.");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível redefinir sua senha. Solicite um novo link.");
      return;
    }
    toast.success("Senha atualizada com segurança.");
    window.location.replace("/admin");
  }
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <section className="panel-lux rounded-2xl p-6 sm:p-8">
        <h1 className="flex items-center gap-2 text-2xl text-gilded">
          <KeyRound className="size-5 text-gold" /> Definir nova senha
        </h1>
        {!validLink ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Este link é inválido ou expirou.{" "}
            <Link to="/recuperar-senha" className="text-gold hover:underline">
              Solicitar novo link
            </Link>
            .
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmar senha</Label>
              <Input
                id="confirmation"
                type="password"
                minLength={8}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <Button className="w-full" disabled={busy}>
              {busy ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
