import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /auth",
            "Disallow: /checkout",
            "Disallow: /checkout-retorno",
            "Disallow: /conta",
            "Disallow: /recuperar-senha",
            "Disallow: /redefinir-senha",
            `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
            "",
          ].join("\n"),
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          },
        ),
    },
  },
});
