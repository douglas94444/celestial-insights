import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  isFreeTier,
  isMapaTier,
  isPaidRolloutTier,
  rolloutLockedMessageForTier,
  type RolloutGates,
} from "@/lib/subscription-rollout";

type RolloutLockedAlertProps = {
  tier: string;
  feature: keyof RolloutGates;
  dayIndex: number;
  /** Título para utilizadores MENSAL/ANUAL na rampa de 7 dias (ex.: «Trânsitos em breve»). */
  rampTitle: string;
  className?: string;
};

export function RolloutLockedAlert({
  tier,
  feature,
  dayIndex,
  rampTitle,
  className,
}: RolloutLockedAlertProps) {
  const title =
    isMapaTier(tier) || isFreeTier(tier)
      ? "Funcionalidade Premium"
      : isPaidRolloutTier(tier)
        ? rampTitle
        : "Funcionalidade Premium";
  const showPremiumCta = isMapaTier(tier) || isFreeTier(tier);

  return (
    <Alert className={className ?? "border-primary/25 bg-primary/5"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className={showPremiumCta ? "space-y-3" : undefined}>
        <p>{rolloutLockedMessageForTier(tier, feature, dayIndex)}</p>
        {showPremiumCta ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/5"
          >
            <Link to="/planos">Ver planos Premium</Link>
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
