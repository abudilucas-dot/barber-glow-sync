import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PLATFORM } from "@/lib/barber-store";
import { absoluteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: `Política de Privacidade — ${PLATFORM.name}` },
      { name: "description", content: "Como o BarberLink trata dados pessoais." },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/privacidade") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="size-3.5" /> Início
      </Link>
      <article className="panel-lux mt-6 rounded-2xl p-6 sm:p-8">
        <h1 className="text-3xl text-gilded">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: setembro de 2026.</p>
        <LegalSection title="Dados tratados">
          Ao agendar, tratamos nome, WhatsApp, serviço, profissional, data e horário. Donos de
          barbearia também fornecem dados de cadastro e cobrança.
        </LegalSection>
        <LegalSection title="Finalidades">
          Usamos os dados para confirmar e administrar reservas, permitir o atendimento pela
          barbearia, prevenir fraudes e cumprir obrigações legais.
        </LegalSection>
        <LegalSection title="Compartilhamento">
          Os dados de uma reserva são compartilhados somente com a barbearia escolhida e
          fornecedores necessários para autenticação, infraestrutura e pagamento. Não vendemos dados
          pessoais.
        </LegalSection>
        <LegalSection title="Retenção e segurança">
          Mantemos dados pelo período necessário ao atendimento, histórico operacional e exigências
          legais. Aplicamos controle de acesso por barbearia; nenhum sistema é infalível, por isso
          reporte suspeitas imediatamente.
        </LegalSection>
        <LegalSection title="Seus direitos">
          Você pode solicitar acesso, correção, eliminação, informação sobre compartilhamento ou
          revogação de consentimento. Fale primeiro com a barbearia responsável pelo atendimento ou
          com o suporte do BarberLink.
        </LegalSection>
        <LegalSection title="Contato">
          Antes da publicação, substitua este texto pelo canal oficial do controlador de dados:
          privacidade@seu-dominio.com.
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
