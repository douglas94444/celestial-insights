import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createMercadoPagoTransparentPaymentFn } from "@/lib/mercadopago.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import type { SubscriptionPlanId } from "@/lib/subscription-pricing";

type Props = {
  publicKey: string;
  plan: SubscriptionPlanId;
  amount: number;
  payerEmail: string;
  /** CPF apenas dígitos (11) */
  identificationNumber: string;
  session: Session;
  disabled?: boolean;
  onSubscriptionActivated: () => void;
};

export function MercadoPagoTransparentCardBrick({
  publicKey,
  plan,
  amount,
  payerEmail,
  identificationNumber,
  session,
  disabled,
  onSubscriptionActivated,
}: Props) {
  const initDone = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!publicKey.trim() || initDone.current) return;
    initDone.current = true;
    initMercadoPago(publicKey.trim(), { locale: "pt-BR" });
    setSdkReady(true);
  }, [publicKey]);

  if (!sdkReady) {
    return (
      <p className="text-sm text-muted-foreground">
        A carregar o formulário seguro do Mercado Pago…
      </p>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <CardPayment
        id={`mp-transparent-card-${plan}`}
        key={`${plan}-${amount}`}
        locale="pt-BR"
        initialization={{
          amount,
          payer: {
            email: payerEmail,
            identification: { type: "CPF", number: identificationNumber },
          },
        }}
        customization={{
          visual: {
            style: {
              theme: "default",
            },
          },
        }}
        onSubmit={async (formData) => {
          try {
            const res = await createMercadoPagoTransparentPaymentFn({
              data: {
                plan,
                token: formData.token,
                issuer_id: formData.issuer_id,
                payment_method_id: formData.payment_method_id,
                transaction_amount: formData.transaction_amount,
                installments: formData.installments,
              },
              ...withSupabaseAuth(session),
            });
            if (res.status === "approved") {
              toast.success("Pagamento aprovado. O seu plano foi atualizado.");
              onSubscriptionActivated();
            } else if (res.status === "pending") {
              toast.message("Pagamento em análise", {
                description:
                  "O plano será atualizado após confirmação do Mercado Pago. Pode atualizar esta página daqui a instantes.",
              });
              onSubscriptionActivated();
            } else {
              toast.error("Pagamento não aprovado.");
              throw new Error("mp_rejected");
            }
          } catch (e) {
            await toastServerFnError(e);
            throw new Error("mp_submit_failed");
          }
        }}
      />
    </div>
  );
}
