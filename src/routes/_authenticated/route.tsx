import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

/**
 * This runs after the root route has configured the browser Supabase client.
 * A route `beforeLoad` runs earlier and would read an empty browser env in
 * Lovable Cloud, causing the generic error screen immediately after sign-in.
 */
function AuthenticatedLayout() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        const next = window.location.pathname + window.location.search;
        window.location.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      setAuthenticated(true);
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">
        Carregando...
      </main>
    );
  }

  return authenticated ? <Outlet /> : null;
}
