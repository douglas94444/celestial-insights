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
  type MercadoPagoAvailabilityData,
} from "@/lib/mercadopago.functions";
import {
  createSyncPayPixOrderFn,
  getSyncPayAvailabilityFn,
  getSyncPayTransactionFn,
} from "@/lib/syncpay.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import { formatSubscriptionPriceBrl, SUBSCRIPTION_PLAN_AMOUNTS } from "@/lib/subscription-pricing";
import { supabase } from "@/integrations/supabase/client";
import {
  ENGAGEMENT_TOPICS,
  recordCheckoutBillingReadyDeduped,
  recordCheckoutEngagement,
  recordCheckoutPageViewDeduped,
} from "@/lib/engagement";
import { cn } from "@/lib/utils";

const SESSION_MP_ORDER_REF = "astromap_mp_order_ref";

type PremiumSubscriptionPlan = "mensal" | "anual";
type PremiumPayMethod = "pix" | "mp_transparent" | "mp_checkout_pro";
type MapaPayMethod = "pix" | "mp_checkout_pro";

export const Route = createFileRoute("/_authenticated/assinatura")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { mp?: "success" | "failure" | "pending"; produto?: "mapa" } => {
    const mp = search.mp;
    const produto = search.produto;
    return {
      ...(mp === "success" || mp === "failure" || mp === "pending" ? { mp } : {}),
      ...(produto === "mapa" ? { produto: "mapa" as const } : {}),
    };
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

function PaymentEnvGapBlock({ label, gaps }: { label: string; gaps: string[] | null }) {
  if (gaps === null) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/15 px-3 py-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Lista não disponível nesta resposta (atualize o deploy se esperava diagnóstico).
        </p>
      </div>
    );
  }
  if (gaps.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/25 bg-muted/20 px-3 py-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Nenhuma das variáveis verificadas aparece em falta neste processo.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-500/35 bg-amber-500/[0.06] px-3 py-2">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
        {gaps.map((g) => (
          <li key={`${label}-${g}`}>
            <code className="rounded bg-muted px-1 text-foreground">{g}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PremiumPlansPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { mp, produto } = useSearch({ from: "/_authenticated/assinatura" });
  const isMapa = produto === "mapa";
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
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<PremiumSubscriptionPlan | null>(
    null,
  );
  const [premiumPayMethod, setPremiumPayMethod] = useState<PremiumPayMethod | null>(null);
  const [mapaPayMethod, setMapaPayMethod] = useState<MapaPayMethod | null>(null);
  const pixSuccessRecorded = useRef(false);
  const mpProSuccessRecorded = useRef(false);

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

  const mpAvailabilityQuery = useQuery<MercadoPagoAvailabilityData>({
    queryKey: ["mercadopago-availability", user?.id],
    queryFn: async (): Promise<MercadoPagoAvailabilityData> => {
      if (!session) {
        return {
          checkoutPro: false,
          transparent: false,
          publicKey: undefined,
        };
      }
      return (await getMercadoPagoAvailabilityFn({
        ...withSupabaseAuth(session),
      })) as MercadoPagoAvailabilityData;
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
    setSelectedPremiumPlan(null);
    setPremiumPayMethod(null);
    setMapaPayMethod(null);
  }, [isMapa]);

  useEffect(() => {
    if (!txIdentifier) pixSuccessRecorded.current = false;
  }, [txIdentifier]);

  useEffect(() => {
    setPremiumPayMethod(null);
  }, [selectedPremiumPlan]);

  useEffect(() => {
    if (!mpResumeExternalRef) mpProSuccessRecorded.current = false;
  }, [mpResumeExternalRef]);

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
    void navigate({ to: "/assinatura", search: {}, replace: true });
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
      if (!mpProSuccessRecorded.current) {
        mpProSuccessRecorded.current = true;
        recordCheckoutEngagement(supabase, user.id, ENGAGEMENT_TOPICS.checkout_payment_confirmed, {
          channel: "mp_checkout_pro",
          produto: isMapa ? "mapa" : "premium",
        });
      }
      void qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Pagamento confirmado. O seu plano foi atualizado.");
      sessionStorage.removeItem(SESSION_MP_ORDER_REF);
      setMpResumeExternalRef(null);
      void navigate({ to: "/assinatura", search: {}, replace: true });
    }
    if (st === "rejected" || st === "cancelled") {
      toast.error("Pagamento não aprovado.");
      sessionStorage.removeItem(SESSION_MP_ORDER_REF);
      setMpResumeExternalRef(null);
      void navigate({ to: "/assinatura", search: {}, replace: true });
    }
  }, [mpOrderPoll.data?.localStatus, mpResumeExternalRef, navigate, qc, user?.id, isMapa]);

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
      if (!pixSuccessRecorded.current) {
        pixSuccessRecorded.current = true;
        recordCheckoutEngagement(supabase, user.id, ENGAGEMENT_TOPICS.checkout_payment_confirmed, {
          channel: "syncpay_pix",
          produto: isMapa ? "mapa" : "premium",
        });
      }
      void qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Pagamento confirmado. O seu plano foi atualizado.");
      setPixCode(null);
      setTxIdentifier(null);
    }
  }, [pollQuery.data?.remoteStatus, qc, user?.id, isMapa]);

  const createOrder = useMutation({
    mutationFn: async (plan: "mensal" | "anual" | "mapa") => {
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
    onMutate: (plan) => {
      recordCheckoutEngagement(supabase, user?.id, ENGAGEMENT_TOPICS.checkout_initiate_pix, {
        plan,
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
    mutationFn: async (plan: "mensal" | "anual" | "mapa") => {
      if (!session) throw new Error("Sessão necessária.");
      return createMercadoPagoPreferenceFn({
        data: { plan },
        ...withSupabaseAuth(session),
      });
    },
    onMutate: (plan) => {
      recordCheckoutEngagement(
        supabase,
        user?.id,
        ENGAGEMENT_TOPICS.checkout_initiate_mp_checkout_pro,
        {
          plan,
        },
      );
    },
    onSuccess: (res) => {
      sessionStorage.setItem(SESSION_MP_ORDER_REF, res.externalReference);
      window.location.href = res.redirectUrl;
    },
    onError: (e) => void toastServerFnError(e),
  });

  const hasBillingForPayment =
    onlyDigits(billingCpf).length === 11 && onlyDigits(billingPhone).length >= 10;

  useEffect(() => {
    if (!user?.id) return;
    if (availabilityQuery.isLoading || mpAvailabilityQuery.isLoading) return;
    recordCheckoutPageViewDeduped(supabase, user.id, {
      produto: isMapa ? "mapa" : "premium",
      checkoutReady,
      mpTransparent,
      mpCheckoutPro,
    });
  }, [
    user?.id,
    isMapa,
    checkoutReady,
    mpTransparent,
    mpCheckoutPro,
    availabilityQuery.isLoading,
    mpAvailabilityQuery.isLoading,
  ]);

  useEffect(() => {
    if (!user?.id || !hasBillingForPayment) return;
    recordCheckoutBillingReadyDeduped(supabase, user.id, { produto: isMapa ? "mapa" : "premium" });
  }, [user?.id, hasBillingForPayment, isMapa]);

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

  const mapaPrice = formatSubscriptionPriceBrl(SUBSCRIPTION_PLAN_AMOUNTS.mapa);
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
    if (parts.length === 0) return "Pagamento indisponível neste ambiente";
    return parts.join(" · ");
  })();

  const cpfDigits = onlyDigits(billingCpf);
  const phoneDigits = onlyDigits(billingPhone);
  const cpfFormatHint = billingCpf.length > 0 && cpfDigits.length !== 11;
  const phoneFormatHint =
    billingPhone.length > 0 && (phoneDigits.length < 10 || phoneDigits.length > 11);

  const premiumPaymentOptionCount = useMemo(() => {
    if (isMapa) return 0;
    let n = 0;
    if (checkoutReady) n++;
    if (mpTransparent) n++;
    if (mpCheckoutPro && !mpTransparent) n++;
    return n;
  }, [isMapa, checkoutReady, mpTransparent, mpCheckoutPro]);

  const premiumMethodForUi = useMemo((): PremiumPayMethod | null => {
    if (!selectedPremiumPlan || isMapa) return null;
    if (premiumPaymentOptionCount === 1) {
      if (checkoutReady) return "pix";
      if (mpTransparent) return "mp_transparent";
      if (mpCheckoutPro && !mpTransparent) return "mp_checkout_pro";
      return null;
    }
    return premiumPayMethod;
  }, [
    selectedPremiumPlan,
    isMapa,
    premiumPaymentOptionCount,
    checkoutReady,
    mpTransparent,
    mpCheckoutPro,
    premiumPayMethod,
  ]);

  const mapaPaymentOptionCount = useMemo(() => {
    if (!isMapa) return 0;
    let n = 0;
    if (checkoutReady) n++;
    if (mpCheckoutPro) n++;
    return n;
  }, [isMapa, checkoutReady, mpCheckoutPro]);

  const mapaMethodForUi = useMemo((): MapaPayMethod | null => {
    if (!isMapa) return null;
    if (mapaPaymentOptionCount === 1) {
      if (checkoutReady) return "pix";
      if (mpCheckoutPro) return "mp_checkout_pro";
      return null;
    }
    return mapaPayMethod;
  }, [isMapa, mapaPaymentOptionCount, checkoutReady, mpCheckoutPro, mapaPayMethod]);

  const showPremiumMethodPicker =
    !isMapa &&
    showBillingForm &&
    selectedPremiumPlan &&
    premiumPaymentOptionCount > 1 &&
    premiumPayMethod === null;

  const showPremiumCheckoutStep =
    !isMapa && showBillingForm && selectedPremiumPlan && premiumMethodForUi !== null;

  const showMapaMethodPicker =
    isMapa && showBillingForm && mapaPaymentOptionCount > 1 && mapaPayMethod === null;

  const showMapaCheckoutStep = isMapa && showBillingForm && mapaMethodForUi !== null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
      <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
      <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />

      <div className="container relative z-[1] mx-auto max-w-4xl space-y-8 p-4 pb-12 sm:p-6 texture-grain">
        <div className="text-center sm:text-left">
          <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/5">
            {isMapa ? "Mapa Natal" : paymentBadgeLabel}
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {isMapa ? `Mapa Natal Completo — ${mapaPrice}` : "Planos AstroMap"}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {isMapa
              ? "Pagamento único e permanente. Roda natal interactiva, planetas, aspectos e interpretações com IA. Sem mensalidade."
              : "Mensal e anual incluem os mesmos recursos quando a rampa de 7 dias termina (desbloqueio gradual por dia civil, fuso São Paulo). Pode pagar com Pix (SyncPay) ou com cartão via Mercado Pago (nesta página ou no site do MP, conforme as opções ativas)."}
          </p>
          {isMapa && (
            <p className="mt-2 text-sm text-muted-foreground">
              Quer também sinastria, trânsitos e PDF?{" "}
              <Link to="/assinatura" className="text-primary underline underline-offset-2">
                Ver planos Premium
              </Link>
            </p>
          )}
        </div>

        {!isMapa && (
          <Alert className="border-primary/25 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle>Transparência</AlertTitle>
            <AlertDescription>
              Pode usar a conta desde o primeiro dia; na primeira semana algumas áreas abrem dia a
              dia (trânsitos, sinastria, mapa composto, etc.). O CPF e o telefone são usados para
              cumprir requisitos das operadoras de pagamento (Pix e Mercado Pago).
            </AlertDescription>
          </Alert>
        )}

        {isMapa ? (
          <Card className="mx-auto max-w-md border-2 border-primary shadow-mystical">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Mapa Natal Completo</CardTitle>
              <CardDescription>Pagamento único — sem mensalidade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-display text-3xl font-bold">{mapaPrice}</p>
              <p className="text-xs text-muted-foreground">
                Pagamento único. O mapa fica na sua conta com acesso permanente na app (sem
                mensalidade nem data de expiração para consulta).
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Roda natal interactiva",
                  "Planetas, casas e aspectos completos",
                  "IA: Sol, Lua, Ascendente, planetas e essência natal",
                  "Configurações especiais (Grand Trine, T-Square, Yod…)",
                  "Acesso permanente",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            <Card
              className={cn(
                "relative border-2 shadow-mystical",
                selectedPremiumPlan === "anual" ? "border-primary" : "border-border",
              )}
            >
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
                    <Badge className="bg-mystical text-white hover:bg-mystical/90">
                      Plano atual
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>Predefinição sugerida — melhor valor por mês</CardDescription>
              </CardHeader>
              <CardContent className="flex h-full min-h-0 flex-col space-y-2 sm:space-y-3">
                <p className="font-display text-2xl sm:text-3xl font-bold">
                  {anualPrice}
                  <span className="text-base font-normal text-muted-foreground">/ano</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatSubscriptionPriceBrl(SUBSCRIPTION_PLAN_AMOUNTS.anual / 12)}/mês · economia
                  de {anualSavings} vs mensal
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
                  disabled={!showBillingForm}
                  onClick={() => setSelectedPremiumPlan("anual")}
                >
                  {selectedPremiumPlan === "anual"
                    ? "Plano anual seleccionado"
                    : "Continuar com este plano"}
                </Button>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "border bg-card shadow-soft",
                selectedPremiumPlan === "mensal" ? "border-2 border-primary" : "",
              )}
            >
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl">
                  Mensal
                  {highlightMensal ? (
                    <Badge className="bg-mystical text-white hover:bg-mystical/90">
                      Plano atual
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>Cobrança mês a mês</CardDescription>
              </CardHeader>
              <CardContent className="flex h-full min-h-0 flex-col space-y-2 sm:space-y-3">
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
                  disabled={!showBillingForm}
                  onClick={() => setSelectedPremiumPlan("mensal")}
                >
                  {selectedPremiumPlan === "mensal"
                    ? "Plano mensal seleccionado"
                    : "Continuar com este plano"}
                </Button>
              </CardContent>
            </Card>

            {selectedPremiumPlan ? (
              <div className="relative z-10 col-span-full flex justify-center border-t border-border/40 pt-4 sm:justify-start">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-primary"
                  onClick={() => setSelectedPremiumPlan(null)}
                >
                  Alterar plano
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {showPremiumMethodPicker ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Como quer pagar?</CardTitle>
              <CardDescription>
                Plano{" "}
                {selectedPremiumPlan === "anual"
                  ? `anual (${anualPrice})`
                  : `mensal (${mensalPrice})`}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {checkoutReady ? (
                <Button
                  type="button"
                  className="h-auto min-h-14 flex-col gap-1 bg-mystical py-4 text-white hover:opacity-90"
                  onClick={() => setPremiumPayMethod("pix")}
                >
                  <span className="font-medium">Pix</span>
                  <span className="text-xs font-normal opacity-90">Confirmação na app</span>
                </Button>
              ) : null}
              {mpTransparent ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto min-h-14 flex-col gap-1 py-4"
                  onClick={() => setPremiumPayMethod("mp_transparent")}
                >
                  <span className="font-medium">Cartão nesta página</span>
                  <span className="text-xs text-muted-foreground">Checkout Transparente</span>
                </Button>
              ) : null}
              {mpCheckoutPro && !mpTransparent ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto min-h-14 flex-col gap-1 py-4 sm:col-span-2"
                  onClick={() => setPremiumPayMethod("mp_checkout_pro")}
                >
                  <span className="font-medium">Cartão no Mercado Pago</span>
                  <span className="text-xs text-muted-foreground">
                    Abre o site do MP (nova página)
                  </span>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {showMapaMethodPicker ? (
          <Card className="mx-auto max-w-md border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Como quer pagar?</CardTitle>
              <CardDescription>Mapa Natal completo — {mapaPrice}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {checkoutReady ? (
                <Button
                  type="button"
                  className="bg-mystical text-white hover:opacity-90"
                  onClick={() => setMapaPayMethod("pix")}
                >
                  Pix
                </Button>
              ) : null}
              {mpCheckoutPro ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMapaPayMethod("mp_checkout_pro")}
                >
                  Mercado Pago (nova página)
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {showBillingForm &&
        ((isMapa && showMapaCheckoutStep) || (!isMapa && showPremiumCheckoutStep)) ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Dados de cobrança</CardTitle>
              <CardDescription>
                CPF (11 dígitos) e telefone com DDD (10 ou 11 dígitos). São exigidos pelo Pix e pelo
                Mercado Pago no Brasil. Pode guardá-los também em{" "}
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
                  aria-invalid={cpfFormatHint}
                  className={cn(
                    cpfFormatHint && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {cpfFormatHint ? (
                  <p className="text-xs text-destructive">Use 11 dígitos (sem pontos ou traços).</p>
                ) : null}
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
                  aria-invalid={phoneFormatHint}
                  className={cn(
                    phoneFormatHint && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {phoneFormatHint ? (
                  <p className="text-xs text-destructive">
                    Inclua DDD + número (10 ou 11 dígitos no total).
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!showBillingForm ? (
          <div className="mx-auto max-w-2xl space-y-3">
            <Alert className="border-muted bg-muted/30">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertTitle>Meios de pagamento indisponíveis</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  Não foi possível ativar Pix ou Mercado Pago nesta sessão: os botões de pagamento
                  ficam desativados até o servidor (Cloudflare Worker ou ambiente local) ter SyncPay
                  e/ou Mercado Pago corretamente configurados. Pode continuar a usar o app com o
                  plano atual.
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>
                    Confirme que está no endereço (URL) oficial da aplicação, o mesmo que costuma
                    usar.
                  </li>
                  <li>
                    Se acabou de fazer deploy, aguarde alguns minutos e atualize a página;
                    alterações de secrets no Worker só aplicam após novo deploy.
                  </li>
                  <li>
                    Em ambiente de teste ou self-hosted, quem gere a infraestrutura deve validar
                    variáveis e URL pública conforme o guia no repositório (
                    <code className="rounded bg-muted px-1">docs/operacao-ambiente.md</code>).
                  </li>
                </ul>
                {import.meta.env.VITE_APP_GITHUB_URL ? (
                  <p className="text-sm">
                    <a
                      href={`${String(import.meta.env.VITE_APP_GITHUB_URL).replace(/\/$/, "")}/blob/main/docs/operacao-ambiente.md`}
                      className="text-primary underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir guia de ambiente no GitHub
                    </a>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
            {showPaymentsOperatorHint ? (
              <p className="text-center text-xs text-muted-foreground">
                Para ativar: no Worker (ou `.env` local), configure conforme{" "}
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
            {showPaymentsOperatorHint ? (
              <Card className="border-amber-500/25 bg-amber-500/[0.04] shadow-none">
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="font-display text-base">
                    Diagnóstico (dev ou administrador)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Variáveis em falta no processo que executa as server functions (por exemplo{" "}
                    <code className="rounded bg-muted px-0.5">vite</code> local ou o Worker). A
                    ausência de <code className="rounded bg-muted px-0.5">APP_PUBLIC_URL</code>{" "}
                    impede o Checkout Pro; a chave pública é necessária à parte para cartão nesta
                    página.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availabilityQuery.isLoading || mpAvailabilityQuery.isLoading ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar diagnóstico…
                    </p>
                  ) : (
                    <>
                      <PaymentEnvGapBlock
                        label="SyncPay (Pix)"
                        gaps={
                          availabilityQuery.data &&
                          "configurationGaps" in availabilityQuery.data &&
                          Array.isArray(availabilityQuery.data.configurationGaps)
                            ? availabilityQuery.data.configurationGaps
                            : null
                        }
                      />
                      <div className="space-y-2">
                        <PaymentEnvGapBlock
                          label="Mercado Pago — Checkout Pro"
                          gaps={
                            mpAvailabilityQuery.data &&
                            "configurationGaps" in mpAvailabilityQuery.data &&
                            Array.isArray(mpAvailabilityQuery.data.configurationGaps.checkoutPro)
                              ? mpAvailabilityQuery.data.configurationGaps.checkoutPro
                              : null
                          }
                        />
                        <PaymentEnvGapBlock
                          label="Mercado Pago — cartão nesta página"
                          gaps={
                            mpAvailabilityQuery.data &&
                            "configurationGaps" in mpAvailabilityQuery.data &&
                            Array.isArray(mpAvailabilityQuery.data.configurationGaps.transparent)
                              ? mpAvailabilityQuery.data.configurationGaps.transparent
                              : null
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {!isMapa && showPremiumCheckoutStep && premiumMethodForUi === "pix" ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pagamento com Pix</CardTitle>
              <CardDescription>
                Gere o código Pix para o plano{" "}
                {selectedPremiumPlan === "anual"
                  ? `anual (${anualPrice})`
                  : `mensal (${mensalPrice})`}
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-mystical text-white hover:opacity-90"
                disabled={
                  !checkoutReady ||
                  !hasBillingForPayment ||
                  createOrder.isPending ||
                  createMpPreference.isPending ||
                  !selectedPremiumPlan
                }
                onClick={() => {
                  if (selectedPremiumPlan) createOrder.mutate(selectedPremiumPlan);
                }}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gerar Pix…
                  </>
                ) : (
                  `Gerar Pix — ${selectedPremiumPlan === "anual" ? "Anual" : "Mensal"}`
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!isMapa &&
        showPremiumCheckoutStep &&
        premiumMethodForUi === "mp_transparent" &&
        selectedPremiumPlan ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Cartão nesta página (Checkout Transparente)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session && user?.email && hasBillingForPayment ? (
                <MercadoPagoTransparentCardBrick
                  publicKey={mpPublicKey}
                  plan={selectedPremiumPlan}
                  amount={SUBSCRIPTION_PLAN_AMOUNTS[selectedPremiumPlan]}
                  payerEmail={user.email}
                  identificationNumber={onlyDigits(billingCpf)}
                  session={session}
                  disabled={createOrder.isPending || createMpPreference.isPending}
                  onMercadoPagoTransparentOutcome={({ status }) => {
                    if (!user?.id || !selectedPremiumPlan) return;
                    recordCheckoutEngagement(
                      supabase,
                      user.id,
                      ENGAGEMENT_TOPICS.checkout_payment_confirmed_mp_transparent,
                      { status, plan: selectedPremiumPlan },
                    );
                  }}
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

        {!isMapa &&
        showPremiumCheckoutStep &&
        premiumMethodForUi === "mp_checkout_pro" &&
        selectedPremiumPlan ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Checkout Mercado Pago (nova página)
              </CardTitle>
              <CardDescription>
                Será redirecionado para o site seguro do Mercado Pago. O plano atualiza após
                confirmação do pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={
                  !mpCheckoutPro ||
                  !hasBillingForPayment ||
                  createMpPreference.isPending ||
                  createOrder.isPending
                }
                onClick={() => {
                  if (selectedPremiumPlan) createMpPreference.mutate(selectedPremiumPlan);
                }}
              >
                {createMpPreference.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir checkout…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {selectedPremiumPlan === "anual"
                      ? `Anual — ${anualPrice}`
                      : `Mensal — ${mensalPrice}`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isMapa && showMapaCheckoutStep && mapaMethodForUi === "pix" ? (
          <Card className="mx-auto max-w-md border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pagamento com Pix</CardTitle>
              <CardDescription>Mapa Natal completo — {mapaPrice}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-mystical text-white hover:opacity-90"
                disabled={
                  !checkoutReady ||
                  createOrder.isPending ||
                  createMpPreference.isPending ||
                  !hasBillingForPayment
                }
                onClick={() => createOrder.mutate("mapa")}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gerar Pix…
                  </>
                ) : (
                  `Gerar Pix — ${mapaPrice}`
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isMapa && showMapaCheckoutStep && mapaMethodForUi === "mp_checkout_pro" ? (
          <Card className="mx-auto max-w-md border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Mercado Pago (nova página)
              </CardTitle>
              <CardDescription>Pagamento único do mapa — {mapaPrice}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={
                  !mpCheckoutPro ||
                  !hasBillingForPayment ||
                  createMpPreference.isPending ||
                  createOrder.isPending
                }
                onClick={() => createMpPreference.mutate("mapa")}
              >
                {createMpPreference.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir checkout…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar com Mercado Pago
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {mpResumeExternalRef && (mp === "success" || mp === "pending") && mpCheckoutPro ? (
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-base">Confirmação Mercado Pago</CardTitle>
              <CardDescription>
                Se já concluiu o pagamento no site do Mercado Pago, aguarde a confirmação abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {mpOrderPoll.data?.localStatus === "pending" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />A aguardar confirmação do Mercado
                  Pago…
                </span>
              ) : (
                <span>A verificar estado do pagamento…</span>
              )}
            </CardContent>
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
      </div>
    </div>
  );
}
