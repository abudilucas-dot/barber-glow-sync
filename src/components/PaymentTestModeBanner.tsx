const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-center text-xs text-destructive-foreground">
        O checkout de produção ainda não está configurado neste site.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-gold/40 bg-accent/40 px-4 py-2 text-center text-xs text-muted-foreground">
        Ambiente de teste: nenhum pagamento real é cobrado no preview.
      </div>
    );
  }
  return null;
}
