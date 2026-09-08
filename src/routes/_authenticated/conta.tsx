import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Segurança da conta — BarberLink" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use pelo menos 8 caracteres na senha.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar a senha. Faça login novamente e tente de novo.");
      return;
    }
    setPassword("");
    toast.success("Senha atualizada. Agora você também pode entrar por e-mail e senha.");
  }
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="size-3.5" /> Painel
      </Link>
      <section className="panel-lux mt-6 rounded-2xl p-6">
        <h1 className="flex items-center gap-2 text-2xl text-gilded">
          <KeyRound className="size-5 text-gold" /> Segurança da conta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Conta: {email}. Usuários que entram pelo Google podem definir uma senha aqui.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="account-password">Nova senha</Label>
            <Input
              id="account-password"
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button disabled={busy}>{busy ? "Salvando..." : "Definir senha"}</Button>
        </form>
      </section>
    </main>
  );
}
