import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Segurança da conta — BarberLink" },
      { name: "description", content: "Gerencie o perfil e a segurança da sua conta BarberLink." },
      { property: "og:title", content: "Minha conta — BarberLink" },
      { property: "og:description", content: "Gerencie o perfil e a segurança da sua conta BarberLink." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("full_name, phone, avatar_url").eq("user_id", user.id).maybeSingle();
      setFullName(profile?.full_name ?? String(user.user_metadata["full_name"] ?? ""));
      setPhone(profile?.phone ?? String(user.user_metadata["phone"] ?? ""));
      setAvatarUrl(profile?.avatar_url ?? String(user.user_metadata["avatar_url"] ?? ""));
    });
  }, []);
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      toast.error("Entre novamente para salvar seu perfil.");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({ user_id: data.user.id, full_name: fullName.trim(), phone: phone.trim(), avatar_url: avatarUrl.trim() || null });
    setBusy(false);
    if (error) toast.error("Não foi possível salvar o perfil.");
    else toast.success("Perfil atualizado.");
  }
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
          <UserRound className="size-5 text-gold" /> Perfil do dono
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Conta: {email}</p>
        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <div className="space-y-2"><Label htmlFor="owner-name">Nome completo</Label><Input id="owner-name" required minLength={3} value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="owner-phone">WhatsApp</Label><Input id="owner-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="owner-avatar">Foto (URL)</Label><Input id="owner-avatar" type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></div>
          <Button disabled={busy}>{busy ? "Salvando..." : "Salvar perfil"}</Button>
        </form>
      </section>
      <section className="panel-lux mt-6 rounded-2xl p-6">
        <h1 className="flex items-center gap-2 text-2xl text-gilded">
          <KeyRound className="size-5 text-gold" /> Segurança da conta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Usuários que entram pelo Google também podem definir uma senha aqui.
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
