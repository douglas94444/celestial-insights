import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, CreditCard, Info, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useUserIsAdmin } from "@/hooks/use-user-is-admin";
import { MercadoPagoTransparentCardBrick } from "@/components/MercadoPagoTransparentCardBrick";
import {
  createMercadoPagoPreferenceFn,
  getMercadoPagoAvailabilityFn,
  getMercadoPagoOrderStatusFn,
} from "@/lib/mercadopago.functions";
import {
  createSyncPayPixOrderFn,
  getSyncPayAvailabilityFn,
  getSyncPayTransactionFn,
} from "@/lib/syncpay.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import { formatSubscriptionPriceBrl, SUBSCRIPTION_PLAN_AMOUNTS } from "@/lib/subscription-pricing";

const SESSION_MP_ORDER_REF = "astromap_mp_order_ref";

export const Route = createFileRoute("/_authenticated/premium")({
  validateSearch: (search: Record<string, unknown>): { mp?: "success" | "failure" | "pending" } => {
    const v = search.mp;
    if (v === "success" || v === "failure" || v === "pending") return { mp: v };
    return {};
  },
  component: PremiumPlansPage,
});

const PLAN_FEATURES = [
  "Mapas ilimitados (família, amigos, parceiros)",
  "Sinastria e mapa composto",
  "Interpretações com IA ilimitadas",
  "Trânsitos e previsão anual",
  "Exportação PDF e cartão Instagram personalizados",
  "Diário de humor com correlações",
];

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function PremiumPlansPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { mp } = useSearch({ from: "/_authenticated/premium" });
  const { session, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useUserIsAdmin();
  const showPaymentsOperatorHint = import.meta.env.DEV || isAdmin === true;
  const tier = profile?.subscription_tier ?? "MENSAL";
  const highlightMensal = tier === "MENSAL" || tier === "PREMIUM" || tier === "FREE";
  const highlightAnual = tier === "ANUAL";

  const [billingCpf, setBillingCpf] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [txIdentifier, setTxIdentifier] = useState<string | null>(null);
  const [mpResumeExternalRef, setMpResumeExternalRef] = useState<string | null>(null);
  const mpFailureToastDone = useRef(false);
  const [transparentPlan, setTransparentPlan] = useState<"mensal" | "anual">("mensal");

  useEffect(() => {
    if (profile?.billing_cpf) setBillingCpf(profile.billing_cpf);
    if (profile?.billing_phone) setBillingPhone(profile.billing_phone);
  }, [profile?.billing_cpf, profile?.billing_phone]);

  const availabilityQuery = useQuery({
    queryKey: ["syncpay-availability", user?.id],
    queryFn: async () => {
      if (!session) return { available: false as const };
      return getSyncPayAvailabilityFn({ ...withSupabaseAuth(session) });
    },
    enabled: !!session && !!user?.id,
    staleTime: 60_000,
  });

  const checkoutReady = availabilityQuery.data?.available === true;

  const mpAvailabilityQuery = useQuery({
    queryKey: ["mercadopago-availability", user?.id],
    queryFn: async () => {
      if (!session) {
        return {
          checkoutPro: false as const,
          transparent: false as const,
          publicKey: undefined,
        } as const;
      }
      return getMercadoPagoAvailabilityFn({ ...withSupabaseAuth(session) });
    },
    enabled: !!session && !!user?.id,
    staleTime: 60_000,
  });

  const mpAvail = mpAvailabilityQuery.data;
  const mpCheckoutPro = mpAvail?.checkoutPro === true;
  const mpPublicKey = mpAvail?.publicKey ?? "";
  const mpTransparent = mpAvail?.transparent === true && mpPublicKey.length > 0;
  const showBillingForm = checkoutReady || mpCheckoutPro || mpTransparent;

  useEffect(() => {
    if (mp !== "success" && mp !== "pending") return;
    const r = sessionStorage.getItem(SESSION_MP_ORDER_REF);
    if (r) {
      setMpResumeExternalRef(r);
      toast.message("A confirmar o pagamento…", {
        description:
          "Se já concluiu no Mercado Pago, o plano atualiza em segundos. Pode fechar esta mensagem.",
      });
    } else {
      toast.message("Voltou do checkout Mercado Pago", {
        description:
          "Se o pagamento foi concluído, aguarde alguns segundos e atualize a página ou confira o seu plano em Configurações.",
      });
    }
  }, [mp]);

  useEffect(() => {
    if (mp !== "failure" || mpFailureToastDone.current) return;
    mpFailureToastDone.current = true;
    toast.error("Pagamento Mercado Pago não concluído ou cancelado.");
    sessionStorage.removeItem(SESSION_MP_ORDER_REF);
    void navigate({ to: "/premium", search: {}, replace: true });
  }, [mp, navigate]);

  const mpOrderPoll = useQuery({
    queryKey: ["mercadopago-order", mpResumeExternalRef, user?.id],
    queryFn: async () => {
      if (!session || !mpResumeExternalRef) throw new Error("Sessão ou pedido em falta.");
      return getMercadoPagoOrderStatusFn({
        data: { external_reference: mpResumeExternalRef },
        ...withSupabaseAuth(session),
      });
    },
    enabled:
      !!session &&
      !!mpResumeExternalRef &&
      !!user?.id &&
      (mp === "success" || mp === "pending") &&
      mpCheckoutPro,
    refetchInterval: (q) => {
      const st = q.state.data?.localStatus;
      if (st === "approved" || st === "rejected" || st === "cancelled" || st === "refunded")
        return false;
      return 3500;
    },
  });

  useEffect(() => {
    const st = mpOrderPoll.data?.localStatus;
    if (!st || !mpResumeExternalRef || !user?.id) return;
    if (st === "approved") {
      void qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Pagamento confirmado. O seu plano foi atualizado.");
      sessionStorage.removeItem(SESSION_MP_ORDER_REF);
      setMpResumeExternalRef(null);
      void navigate({ to: "/premium", search: {}, replace: true });
    }
    if (st === "rejected" || st === "cancelled") {
      toast.error("Pagamento não aprovado.");
      sessionStorage.removeItem(SESSION_MP_ORDER_REF);
      setMpResumeExternalRef(null);
      void navigate({ to: "/premium", search: {}, replace: true });
    }
  }, [mpOrderPoll.data?.localStatus, mpResumeExternalRef, navigate, qc, user?.id]);

  const pollQuery = useQuery({
    queryKey: ["syncpay-tx", txIdentifier, user?.id],
    queryFn: async () => {
      if (!session || !txIdentifier) throw new Error("Sessão ou identificador em falta.");
      return getSyncPayTransactionFn({
        data: { identifier: txIdentifier },
        ...withSupabaseAuth(session),
      });
    },
    enabled: !!session && !!txIdentifier && !!user?.id,
    refetchInterval: (q) => {
      const st = q.state.data?.remoteStatus;
      if (st === "completed" || st === "failed" || st === "refunded") return false;
      return 4000;
    },
  });

  useEffect(() => {
    if (pollQuery.data?.remoteStatus === "completed" && user?.id) {
      void qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Pagamento confirmado. O seu plano foi atualizado.");
      setPixCode(null);
      setTxIdentifier(null);
    }
  }, [pollQuery.data?.remoteStatus, qc, user?.id]);

  const createOrder = useMutation({
    mutationFn: async (plan: "mensal" | "anual") => {
      if (!session) throw new Error("Sessão necessária.");
      const cpf = onlyDigits(billingCpf);
      const phone = onlyDigits(billingPhone);
      return createSyncPayPixOrderFn({
        data: {
          plan,
          billing_cpf: cpf.length === 11 ? billingCpf : undefined,
          billing_phone: phone.length >= 10 && phone.length <= 11 ? billingPhone : undefined,
        },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: async (res) => {
      setPixCode(res.pix_code);
      setTxIdentifier(res.identifier);
      toast.message("Pix gerado", {
        description:
          "Copie o código ou pague pelo QR no app do banco. O plano atualiza após confirmação.",
      });
      if (user?.id) {
        await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      }
    },
    onError: (e) => void toastServerFnError(e),
  });

  const createMpPreference = useMutation({
    mutationFn: async (plan: "mensal" | "anual") => {
      if (!session) throw new Error("Sessão necessária.");
      return createMercadoPagoPreferenceFn({
        data: { plan },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (res) => {
      sessionStorage.setItem(SESSION_MP_ORDER_REF, res.externalReference);
      window.location.href = res.redirectUrl;
    },
    onError: (e) => void toastServerFnError(e),
  });

  const hasBillingForPayment =
    onlyDigits(billingCpf).length === 11 && onlyDigits(billingPhone).length >= 10;

  const pollStatus = pollQuery.data?.remoteStatus;
  const pollLabel = useMemo(() => {
    if (!txIdentifier) return null;
    if (pollStatus === "completed") return "Pagamento confirmado.";
    if (pollStatus === "failed" || pollStatus === "refunded") return "Pagamento não concluído.";
    if (pollStatus === "pending") return "Aguardando confirmação do Pix…";
    return "A verificar estado do pagamento…";
  }, [pollStatus, txIdentifier]);

  async function copyPix() {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  const mensalPrice = formatSubscriptionPriceBrl(SUBSCRIPTION_PLAN_AMOUNTS.mensal);
  const anualPrice = formatSubscriptionPriceBrl(SUBSCRIPTION_PLAN_AMOUNTS.anual);
  const anualSavings = formatSubscriptionPriceBrl(
    SUBSCRIPTION_PLAN_AMOUNTS.mensal * 12 - SUBSCRIPTION_PLAN_AMOUNTS.anual,
  );

  const paymentBadgeLabel = (() => {
    const parts: string[] = [];
    if (checkoutReady) parts.push("Pix (SyncPay)");
    if (mpTransparent) parts.push("Cartão (MP — nesta página)");
    if (mpCheckoutPro) parts.push("Checkout MP (redirecionar)");
    if (parts.length === 0) return "Pagamento em preparação";
    return parts.join(" · ");
  })();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
      <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
      <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />

      <div className="container relative z-[1] mx-auto max-w-4xl space-y-8 p-4 pb-12 sm:p-6 texture-grain">
        <div className="text-center sm:text-left">
          <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/5">
            {paymentBadgeLabel}
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Planos AstroMap
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Mensal e anual incluem os mesmos recursos quando a rampa de 7 dias termina (desbloqueio
            gradual por dia civil, fuso São Paulo). Pode pagar com Pix (SyncPay) ou com cartão via
            Mercado Pago (nesta página ou no site do MP, conforme as opções ativas).
          </p>
        </div>

        <Alert className="border-primary/25 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>Transparência</AlertTitle>
          <AlertDescription>
            Pode usar a conta desde o primeiro dia; na primeira semana algumas áreas abrem dia a dia
            (trânsitos, sinastria, mapa composto, etc.). O CPF e o telefone são usados para cumprir
            requisitos das operadoras de pagamento (Pix e Mercado Pago).
          </AlertDescription>
        </Alert>

        {showBillingForm ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Dados de cobrança</CardTitle>
              <CardDescription>
                CPF (11 dígitos) e telefone (10 ou 11 dígitos, com DDD). Pode guardá-los também em{" "}
                <Link to="/configuracoes" className="text-primary underline">
                  Configurações
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billing-cpf">CPF</Label>
                <Input
                  id="billing-cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Somente números"
                  value={billingCpf}
                  onChange={(e) => setBillingCpf(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-phone">Telefone (celular)</Label>
                <Input
                  id="billing-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Somente números com DDD"
                  value={billingPhone}
                  onChange={(e) => setBillingPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            <Alert className="border-muted bg-muted/30">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertTitle>Pagamentos em configuração</AlertTitle>
              <AlertDescription>
                O checkout nesta página ainda não está activo neste ambiente: os botões de pagamento
                ficam desactivados até o servidor ter pelo menos um meio configurado (Pix via
                SyncPay e/ou Mercado Pago). Pode continuar a usar a app com o plano actual.
              </AlertDescription>
            </Alert>
            {showPaymentsOperatorHint ? (
              <p className="text-center text-xs text-muted-foreground">
                Para activar: no Worker (ou `.env` local), configure conforme{" "}
                <code className="rounded bg-muted px-1">docs/operacao-ambiente.md</code> — SyncPay
                (`SYNCPAY_*`, <code className="rounded bg-muted px-1">SUPABASE_URL</code>) e/ou
                Mercado Pago (
                <code className="rounded bg-muted px-1">MERCADOPAGO_ACCESS_TOKEN</code>,{" "}
                <code className="rounded bg-muted px-1">MERCADOPAGO_WEBHOOK_TOKEN</code>,{" "}
                <code className="rounded bg-muted px-1">APP_PUBLIC_URL</code> para Checkout Pro;
                mais <code className="rounded bg-muted px-1">VITE_MERCADOPAGO_PUBLIC_KEY</code> ou{" "}
                <code className="rounded bg-muted px-1">MERCADOPAGO_PUBLIC_KEY</code> para cartão
                nesta página). Depois de alterar secrets, faça novamente o deploy do Worker.
              </p>
            ) : null}
          </div>
        )}

        {mpTransparent ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Cartão nesta página (Checkout Transparente)
              </CardTitle>
              <CardDescription>
                Formulário seguro do Mercado Pago. Os dados do cartão não passam pelos nossos
                servidores. Escolha o plano e conclua o pagamento abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={transparentPlan === "mensal" ? "default" : "outline"}
                  onClick={() => setTransparentPlan("mensal")}
                >
                  Mensal — {mensalPrice}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={transparentPlan === "anual" ? "default" : "outline"}
                  onClick={() => setTransparentPlan("anual")}
                >
                  Anual — {anualPrice}
                </Button>
              </div>
              {session && user?.email && hasBillingForPayment ? (
                <MercadoPagoTransparentCardBrick
                  publicKey={mpPublicKey}
                  plan={transparentPlan}
                  amount={
                    transparentPlan === "mensal"
                      ? SUBSCRIPTION_PLAN_AMOUNTS.mensal
                      : SUBSCRIPTION_PLAN_AMOUNTS.anual
                  }
                  payerEmail={user.email}
                  identificationNumber={onlyDigits(billingCpf)}
                  session={session}
                  disabled={createOrder.isPending || createMpPreference.isPending}
                  onSubscriptionActivated={() => {
                    if (user?.id) {
                      void qc.invalidateQueries({ queryKey: ["profile", user.id] });
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Preencha CPF e telefone em cima (ou em Configurações) e confirme que a sua conta
                  tem email para usar o cartão aqui.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {mpCheckoutPro ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Checkout Mercado Pago (nova página)
              </CardTitle>
              <CardDescription>
                Será redirecionado para o site seguro do Mercado Pago. O plano atualiza após
                confirmação do pagamento. O checkout pode mostrar outros meios além do cartão,
                conforme a sua conta MP.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={
                  !mpCheckoutPro ||
                  !hasBillingForPayment ||
                  createMpPreference.isPending ||
                  createOrder.isPending
                }
                onClick={() => createMpPreference.mutate("mensal")}
              >
                {createMpPreference.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir checkout…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Mensal — {mensalPrice}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={
                  !mpCheckoutPro ||
                  !hasBillingForPayment ||
                  createMpPreference.isPending ||
                  createOrder.isPending
                }
                onClick={() => createMpPreference.mutate("anual")}
              >
                {createMpPreference.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir checkout…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Anual — {anualPrice}
                  </>
                )}
              </Button>
            </CardContent>
            {mpResumeExternalRef && (mp === "success" || mp === "pending") ? (
              <CardContent className="border-t pt-4 text-sm text-muted-foreground">
                {mpOrderPoll.data?.localStatus === "pending" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />A aguardar confirmação do Mercado
                    Pago…
                  </span>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {pixCode && txIdentifier ? (
          <Card className="border-2 border-primary shadow-mystical">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pague com Pix</CardTitle>
              <CardDescription>
                {pollLabel}
                {pollQuery.isFetching ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" /> A atualizar…
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void copyPix()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar código Pix
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPixCode(null);
                    setTxIdentifier(null);
                  }}
                >
                  Fechar
                </Button>
              </div>
              <textarea
                readOnly
                className="min-h-[120px] w-full rounded-md border border-input bg-muted/30 p-3 font-mono text-xs"
                value={pixCode}
              />
              <p className="text-xs text-muted-foreground">
                Identificador: <code className="rounded bg-muted px-1">{txIdentifier}</code>
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl">
                Mensal
                {highlightMensal ? (
                  <Badge className="bg-mystical text-white hover:bg-mystical/90">Plano atual</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>Cobrança mês a mês</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col space-y-2 sm:space-y-3">
              <p className="font-display text-2xl sm:text-3xl font-bold">
                {mensalPrice}
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                {PLAN_FEATURES.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto w-full bg-mystical text-white hover:opacity-90"
                disabled={
                  !checkoutReady ||
                  createOrder.isPending ||
                  createMpPreference.isPending ||
                  !hasBillingForPayment
                }
                onClick={() => createOrder.mutate("mensal")}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gerar Pix…
                  </>
                ) : (
                  "Pagar mensal com Pix"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-primary shadow-mystical">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl">
                Anual
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/15"
                >
                  Melhor custo no ano
                </Badge>
                {highlightAnual ? (
                  <Badge className="bg-mystical text-white hover:bg-mystical/90">Plano atual</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>Melhor custo por mês</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col space-y-2 sm:space-y-3">
              <p className="font-display text-2xl sm:text-3xl font-bold">
                {anualPrice}
                <span className="text-base font-normal text-muted-foreground">/ano</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {formatSubscriptionPriceBrl(SUBSCRIPTION_PLAN_AMOUNTS.anual / 12)}/mês · economia de{" "}
                {anualSavings} vs mensal
              </p>
              <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                {PLAN_FEATURES.map((t) => (
                  <li key={`a-${t}`} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto w-full bg-mystical text-white hover:opacity-90"
                disabled={
                  !checkoutReady ||
                  createOrder.isPending ||
                  createMpPreference.isPending ||
                  !hasBillingForPayment
                }
                onClick={() => createOrder.mutate("anual")}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gerar Pix…
                  </>
                ) : (
                  "Pagar anual com Pix"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button asChild variant="outline">
            <Link to="/configuracoes">Preferências e perfil</Link>
          </Button>
          <Button asChild className="bg-mystical text-white hover:opacity-90">
            <Link to="/dashboard">
              <Sparkles className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
