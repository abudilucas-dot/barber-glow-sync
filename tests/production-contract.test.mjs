import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("a migration de produção protege a reserva e dados de clientes", async () => {
  const migration = await read(
    "supabase/migrations/20260908130000_production_security_and_billing.sql",
  );
  assert.match(migration, /extensions\.digest\(v_phone, 'sha256'\)/);
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.upsert_client\(text, text\)/);
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.create_booking[\s\S]+TO anon, authenticated/,
  );
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.cancel_appointment/);
});

test("checkout identifica a barbearia e restringe a URL de retorno", async () => {
  const payments = await read("src/utils/payments.functions.ts");
  assert.match(payments, /shopId: string/);
  assert.match(payments, /returnUrl\.origin !== requestOrigin/);
  assert.match(payments, /shopId: data\.shopId/);
});

test("webhook é idempotente e não promove todas as barbearias", async () => {
  const webhook = await read("src/routes/api/public/payments/webhook.ts");
  assert.match(webhook, /subscription_events/);
  assert.match(webhook, /applyPlanToShop/);
  assert.doesNotMatch(webhook, /applyPlanToShops/);
});

test("fluxos públicos de senha e documentos legais existem", async () => {
  for (const path of [
    "src/routes/recuperar-senha.tsx",
    "src/routes/redefinir-senha.tsx",
    "src/routes/privacidade.tsx",
    "src/routes/termos.tsx",
  ]) {
    const contents = await read(path);
    assert.ok(contents.length > 100, `${path} deve ter conteúdo`);
  }
});

test("SEO não usa a marca antiga e protege rotas privadas", async () => {
  const auth = await read("src/routes/auth.tsx");
  const publicShop = await read("src/routes/$slug.tsx");
  const robots = await read("src/routes/robots[.]txt.ts");

  assert.doesNotMatch(auth, /Navalha de Ouro/);
  assert.match(auth, /noindex, nofollow/);
  assert.match(publicShop, /throw notFound\(\)/);
  assert.match(robots, /Sitemap:/);
});

test("configura o Supabase no navegador sem expor a chave de serviço", async () => {
  const root = await read("src/routes/__root.tsx");
  const client = await read("src/integrations/supabase/client.ts");

  assert.match(root, /publicSupabase: url && publishableKey/);
  assert.match(root, /configureSupabaseClient\(publicSupabase\)/);
  assert.match(client, /runtimePublicConfig\?\.publishableKey/);
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("dados privados do dono não são expostos pela vitrine pública", async () => {
  const migration = await read("supabase/migrations/20260909020000_safe_public_shop_functions.sql");
  const store = await read("src/lib/shop-store.ts");

  assert.match(migration, /DROP VIEW IF EXISTS public\.public_barbershops/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_public_shops/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_public_shop/);
  assert.doesNotMatch(migration, /owner_whatsapp/);
  assert.match(store, /rpc\("get_public_shops"\)/);
});
