import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://barber-glow-sync.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/precos", changefreq: "monthly", priority: "0.8" },
        ];

        // Barbearias no ar (Pro ou dentro do teste de 30 dias).
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? "";
          const client = createClient(process.env['SUPABASE_URL'] ?? "", key, {
            auth: { persistSession: false },
            global: {
              fetch: (input, init) => {
                const h = new Headers(init?.headers);
                if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
                  h.delete("Authorization");
                }
                h.set("apikey", key);
                return fetch(input, { ...init, headers: h });
              },
            },
          });
          const { data } = await client
            .from("barbershops")
            .select("slug, plan, trial_ends_at, status")
            .eq("status", "active");
          for (const shop of (data ?? []) as Array<{
            slug: string;
            plan: string;
            trial_ends_at: string;
          }>) {
            const live =
              shop.plan === "pro" || new Date(shop.trial_ends_at).getTime() > Date.now();
            if (live) {
              entries.push({ path: `/${shop.slug}`, changefreq: "weekly", priority: "0.9" });
            }
          }
        } catch (e) {
          console.error("sitemap: falha ao listar barbearias", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
