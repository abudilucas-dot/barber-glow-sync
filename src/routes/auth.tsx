import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM } from "@/lib/barber-store";

/** Aceita apenas caminhos relativos da própria aplicação. */
function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}

function authErrorMessage(error: { code?: string | undefined; message: string }): string {
  if (
    error.code === "over_email_send_rate_limit" ||
    error.message.toLowerCase().includes("email rate limit")
  ) {
    return "Limite de e-mails atingido. Aguarde até uma hora ou configure um SMTP próprio no Supabase.";
  }
  if (error.code === "invalid_credentials") {
    return "E-mail ou senha inválidos. Se esta conta foi criada com Google, entre pelo botão Google.";
  }
  return error.message;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeNext(search["next"]),
  }),
  head: () => ({
    meta: [
      { title: "Acesso da Equipe — Navalha de Ouro" },
      {
        name: "description",
        content:
          "Área restrita da barbearia Navalha de Ouro: entre para gerenciar clientes, equipe e agenda.",
      },
      { property: "og:title", content: "Acesso da Equipe — Navalha de Ouro" },
      {
        property: "og:description",
        content: "Entre na conta da barbearia para acessar o painel de gestão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(next);
    });
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setBusy(false);
        toast.error(authErrorMessage(error));
        return;
      }
      if (data.session) {
        toast.success("Conta criada! Entrando...");
        window.location.replace(next);
        return;
      }
      setBusy(false);
      setUnconfirmedEmail(email);
      toast.success("Conta criada! Confirme o e-mail enviado antes de entrar.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (error.code === "email_not_confirmed") {
        setUnconfirmedEmail(email);
        toast.error("Confirme o e-mail enviado antes de entrar.");
      } else {
        toast.error(authErrorMessage(error));
      }
      return;
    }
    window.location.replace(next);
  }

  async function resendConfirmation() {
    if (!unconfirmedEmail) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("E-mail de confirmação reenviado.");
  }

  async function google() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (!error) return;

    setBusy(false);
    toast.error(authErrorMessage(error));
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="panel-lux rounded-2xl p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          {PLATFORM.name}
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl">
          <KeyRound className="size-5 text-gold" />
          <span className="text-gilded">Acesso da Equipe</span>
        </h1>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@barbearia.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google} disabled={busy}>
          Entrar com Google
        </Button>

        {mode === "signin" && (
          <Link
            to="/recuperar-senha"
            className="mt-3 block text-center text-xs text-muted-foreground hover:text-gold"
          >
            Esqueci minha senha
          </Link>
        )}

        {unconfirmedEmail && (
          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-full text-xs"
            disabled={busy}
            onClick={resendConfirmation}
          >
            Reenviar e-mail de confirmação
          </Button>
        )}

        <button
          type="button"
          className="mt-5 w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
