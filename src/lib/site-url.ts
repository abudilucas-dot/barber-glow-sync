/**
 * Endereço público usado em links compartilháveis e metadados SEO.
 *
 * O fallback mantém a publicação do Lovable correta mesmo quando não há uma
 * variável VITE disponível no ambiente de hospedagem. Ao migrar para um
 * domínio próprio, defina VITE_PUBLIC_SITE_URL durante o build.
 */
export const SITE_URL = (
  import.meta.env["VITE_PUBLIC_SITE_URL"] ?? "https://barber-glow-sync.lovable.app"
).replace(/\/$/, "");

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}
