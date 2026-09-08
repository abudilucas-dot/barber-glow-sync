# BarberLink

Plataforma multi-barbearia com página pública, agenda online, painel do dono, autenticação Supabase e assinatura Stripe. O projeto usa React, TanStack Start, Supabase e Stripe, preservando o tema premium dark/gold.

## Desenvolvimento local

Requisitos: Node.js 22+, npm e Supabase CLI.

```bash
npm install
copy .env.example .env
npm run dev
```

O ambiente local utilizado neste projeto abre em `http://localhost:8080`. Confirme a porta exibida pelo Vite antes de cadastrar URLs OAuth.

Comandos de qualidade:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx supabase db lint --linked
```

## Variáveis de ambiente

Nunca versione `.env`, chaves Stripe ou `SUPABASE_SERVICE_ROLE_KEY`.

| Variável                                                           | Onde é usada                    | Pode ir ao navegador? |
| ------------------------------------------------------------------ | ------------------------------- | --------------------- |
| `VITE_SUPABASE_URL`                                                | cliente Supabase                | Sim                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                                    | cliente Supabase                | Sim                   |
| `VITE_PUBLIC_SITE_URL`                                             | canonical, sitemap e SEO        | Sim                   |
| `SUPABASE_URL`                                                     | funções e SSR                   | Não                   |
| `SUPABASE_PUBLISHABLE_KEY`                                         | funções autenticadas/SSR        | Não                   |
| `SUPABASE_SERVICE_ROLE_KEY`                                        | webhook Stripe                  | Não                   |
| `VITE_PAYMENTS_CLIENT_TOKEN`                                       | Stripe.js (`pk_test`/`pk_live`) | Sim                   |
| `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY`                   | servidor Stripe                 | Não                   |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET` | validação do webhook            | Não                   |
| `LOVABLE_API_KEY`                                                  | gateway Stripe Lovable          | Não                   |

## Banco de dados e migrations

O `supabase/config.toml` está vinculado ao projeto Supabase atual. Antes de aplicar qualquer migration, confirme a referência:

```bash
npx supabase link --project-ref qgrzhkmhhnbcrnuqofwt
npx supabase migration list --linked
npx supabase db push --linked --include-all
npx supabase db lint --linked
```

Não edite migrations já aplicadas. A migration `20260908130000_production_security_and_billing.sql` corrige a função de reserva, remove a RPC legada de clientes, restringe dados públicos, preserva cancelamentos e vincula assinatura a uma barbearia.

Depois do push, gere os tipos atualizados quando possível:

```bash
npx supabase gen types typescript --linked --schema public > src/integrations/supabase/types.ts
```

## Configuração Supabase Auth

No Supabase, abra **Authentication → URL Configuration**:

1. Em **Site URL**, use `http://localhost:8080` no desenvolvimento e `https://seu-dominio.com` na produção.
2. Em **Redirect URLs**, adicione `http://localhost:8080/**`, `https://seu-dominio.com/**` e a URL publicada do Lovable, se ela continuar em uso.
3. Em **Providers → Google**, habilite Google e informe Client ID/Secret.
4. Para produção, habilite confirmação de e-mail e configure SMTP próprio em **Authentication → SMTP Settings**.

O aplicativo possui cadastro, login por e-mail/senha, Google, reenvio de confirmação, recuperação de senha e página para definir senha em uma conta inicialmente criada pelo Google.

## Configuração Google OAuth

No Google Cloud Console:

1. Configure a tela de consentimento OAuth como **External** e publique-a quando sair dos testes.
2. Crie um cliente OAuth do tipo **Web application**.
3. Em **Authorized redirect URIs**, informe exatamente:

```text
https://qgrzhkmhhnbcrnuqofwt.supabase.co/auth/v1/callback
```

4. Copie Client ID e Client Secret para o provider Google no Supabase.
5. No Supabase, mantenha as URLs locais e de produção na lista de Redirect URLs.

## Configuração SMTP

Para contas públicas, não use o envio padrão como solução final. Configure Resend, Postmark, Amazon SES, Brevo ou outro SMTP transacional:

1. Verifique um domínio remetente no provedor escolhido.
2. No Supabase, abra **Authentication → SMTP Settings** e habilite SMTP customizado.
3. Informe host, porta, usuário, senha e remetente verificado.
4. Reative **Confirm email**.
5. Teste cadastro, reenvio e recuperação em uma caixa de e-mail real.

## Stripe e assinaturas

Cada checkout exige uma `shopId`; uma assinatura Pro ativa somente a barbearia escolhida.

1. Crie os preços recorrentes com lookup keys `pro_monthly` e `pro_yearly` no Stripe/Lovable Payments.
2. Configure as variáveis Stripe apenas no ambiente de servidor.
3. Cadastre o endpoint de webhook no Stripe:

```text
https://seu-dominio.com/api/public/payments/webhook?env=live
```

4. Assine os eventos `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`.
5. Copie o signing secret para `PAYMENTS_LIVE_WEBHOOK_SECRET`.
6. Repita em modo de teste usando `?env=sandbox` e as chaves de sandbox.
7. Faça um pagamento teste, renovação, cancelamento e reenvio do mesmo evento. O sistema registra eventos para impedir processamento duplicado.

## Publicação e domínio

1. Defina `VITE_PUBLIC_SITE_URL=https://seu-dominio.com` no ambiente de produção.
2. Publique o app e conecte o domínio com HTTPS.
3. Atualize `Site URL`, Redirect URLs do Supabase e URLs permitidas do Google OAuth.
4. Atualize o webhook Stripe com o domínio final.
5. Verifique `https://seu-dominio.com/sitemap.xml`, `/privacidade`, `/termos`, login, recuperação de senha e uma reserva pública.
6. Troque os e-mails de exemplo nas páginas legais pelos canais oficiais antes do lançamento.

## Segurança e privacidade

- Dados de clientes não são expostos publicamente; reservas passam pela RPC segura `create_booking`.
- Cancelamentos usam status `cancelled`, preservando histórico.
- Serviços e barbeiros inativos não aparecem publicamente.
- A reserva pede consentimento para uso de nome e WhatsApp.
- Política de Privacidade e Termos são modelos iniciais: revise-os juridicamente e personalize o controlador, contato e política de retenção antes de lançar.

## CI

O workflow `.github/workflows/quality.yml` executa typecheck, lint e build em pushes para `main` e pull requests.
