import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { useUserIsAdmin } from "@/hooks/use-user-is-admin";
import {
  MAPA_PREMIUM_BANNER_TEXT,
  MAPA_PREMIUM_DIALOG_BODY,
  MAPA_PREMIUM_DIALOG_TITLE,
  SESSION_MAPA_PREMIUM_PROMPT_SHOWN,
} from "@/lib/mapa-product-copy";
import { isMapaTier } from "@/lib/subscription-rollout";

/** Faixa persistente + diálogo uma vez por sessão (MAPA → Premium). */
export function MapaPremiumUpsell() {
  const { data: profile } = useProfile();
  const adminGate = useUserIsAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);

  const tier = profile?.subscription_tier;
  const showMapaUpsell =
    !!tier && isMapaTier(tier) && adminGate.data !== true && !adminGate.isPending;

  useEffect(() => {
    if (!showMapaUpsell) {
      setDialogOpen(false);
      return;
    }
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(SESSION_MAPA_PREMIUM_PROMPT_SHOWN) === "1") return;
    setDialogOpen(true);
  }, [showMapaUpsell]);

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_MAPA_PREMIUM_PROMPT_SHOWN, "1");
    }
  }

  if (!showMapaUpsell) return null;

  return (
    <>
      <Alert className="shrink-0 rounded-none border-x-0 border-t-0 border-primary/35 bg-primary/[0.07] py-2.5">
        <AlertDescription className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-foreground/90">{MAPA_PREMIUM_BANNER_TEXT}</span>
          <Button asChild size="sm" variant="secondary" className="w-full shrink-0 sm:w-auto">
            <Link to="/assinatura">Ver Premium</Link>
          </Button>
        </AlertDescription>
      </Alert>

      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {MAPA_PREMIUM_DIALOG_TITLE}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">{MAPA_PREMIUM_DIALOG_BODY}</p>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Fechar
            </Button>
            <Button asChild className="bg-mystical text-white hover:opacity-90">
              <Link to="/assinatura" onClick={() => handleDialogOpenChange(false)}>
                Ver planos Premium
              </Link>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
