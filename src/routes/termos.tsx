import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import heroImage from "@/assets/hero-barbearia.jpg";
import { PLATFORM } from "@/lib/barber-store";
import { absoluteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: `Termos de Uso — ${PLATFORM.name}` },
      { name: "description", content: "Termos de uso da plataforma BarberLink." },
      { property: "og:image", content: absoluteUrl(heroImage) },
      { property: "og:image:alt", content: "Barbearia clássica com detalhes dourados" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/termos") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="size-3.5" /> Início
      </Link>
      <article className="panel-lux mt-6 rounded-2xl p-6 sm:p-8">
        <h1 className="text-3xl text-gilded">Termos de Uso</h1>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: setembro de 2026.</p>
        <LegalSection title="Uso da plataforma">
          O BarberLink oferece ferramentas de página pública, agenda e gestão. Cada barbearia é
          responsável pelos seus serviços, preços, profissionais, atendimento e cumprimento das leis
          aplicáveis.
        </LegalSection>
        <LegalSection title="Contas e segurança">
          O titular da conta deve usar dados verdadeiros, proteger suas credenciais e manter as
          informações da barbearia atualizadas. Contas podem ser suspensas em caso de uso ilícito ou
          abusivo.
        </LegalSection>
        <LegalSection title="Agendamentos">
          Uma reserva é solicitada pelo cliente e registrada na agenda da barbearia. Alterações,
          cancelamentos, atrasos, preços e condições do serviço são definidos pela barbearia
          responsável.
        </LegalSection>
        <LegalSection title="Planos e pagamentos">
          Após o período de teste, cada barbearia pode exigir assinatura Pro para manter a página
          pública ativa. Cobranças, renovação e cancelamento seguem as condições exibidas no
          checkout.
        </LegalSection>
        <LegalSection title="Limites">
          A plataforma não garante disponibilidade ininterrupta, nem se responsabiliza pela execução
          do serviço presencial, conversa no WhatsApp ou conteúdos inseridos pelos usuários.
        </LegalSection>
        <LegalSection title="Contato">
          Antes da publicação, informe o canal jurídico e de suporte oficial:
          suporte@seu-dominio.com.
        </LegalSection>
      </article>
    </main>
  );
}
function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-lg text-gold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
    </section>
  );
}
