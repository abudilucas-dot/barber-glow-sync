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
