import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Lovable Cloud provides the Supabase credentials to the server as SUPABASE_*.
// The browser needs the URL and the publishable key at build time. Both values
// are safe to expose; the service-role key stays server-only.
const publicSupabaseUrl = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const publicSupabaseKey =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  vite: {
    plugins: [],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicSupabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicSupabaseKey),
    },
  },
});
