import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { PLATFORM } from "@/lib/barber-store";
import { absoluteUrl } from "@/lib/site-url";

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
    return "Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.";
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
      { title: `Acesso da equipe — ${PLATFORM.name}` },
      {
        name: "description",
        content: "Entre para criar e gerenciar suas barbearias, equipe, clientes e agenda.",
      },
      { property: "og:title", content: `Acesso da equipe — ${PLATFORM.name}` },
      {
        property: "og:description",
        content: "Entre na sua conta para acessar o painel de gestão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/auth") }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });
      if (error) {
        setBusy(false);
        toast.error(authErrorMessage(error));
        return;
      }
      if (data.session) {
        if (data.user) {
          await supabase.from("profiles").upsert({
            user_id: data.user.id,
            full_name: fullName.trim(),
            phone: phone.trim(),
          });
        }
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
    sessionStorage.setItem("barberlink:auth-next", next);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
      extraParams: { prompt: "select_account" },
    });
    if (!result.error) return;

    setBusy(false);
    toast.error(authErrorMessage(result.error));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="panel-lux rounded-2xl p-6 sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-md border border-gold/40 bg-accent">
          <Store className="size-5 text-gold" />
        </div>
        <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{PLATFORM.name}</p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl">
          <KeyRound className="size-5 text-gold" />
          <span className="text-gilded">Painel da sua barbearia</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre na conta vinculada à sua loja. Cada conta acessa somente os próprios dados.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="full-name">Nome completo</Label>
                <Input id="full-name" required minLength={3} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(44) 99999-9999" />
              </div>
            </>
          )}
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
            {busy ? "Aguarde..." : mode === "signin" ? "Entrar no painel" : "Criar conta da loja"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google} disabled={busy}>
          Continuar com Google
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

        <Button
          type="button"
          variant="ghost"
          className="mt-5 w-full text-xs uppercase tracking-[0.2em]"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Criar conta para minha loja" : "Já tenho conta"}
        </Button>
        <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>Os clientes, agendamentos e profissionais de uma loja não aparecem para outras contas.</span>
        </div>
      </div>
    </main>
  );
}
