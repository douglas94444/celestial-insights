import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface CtaConfig {
  label: string;
  to: string;
  variant?: "default" | "outline" | "secondary";
}

interface EmptyFeatureStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryCta?: CtaConfig;
  secondaryCta?: CtaConfig;
  className?: string;
}

export function EmptyFeatureState({
  icon: Icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  className = "",
}: EmptyFeatureStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <Icon className="h-10 w-10 text-primary/60" />
        <div className="space-y-1 max-w-sm">
          <p className="font-display text-base font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground leading-snug">{description}</p>
        </div>
        {(primaryCta || secondaryCta) && (
          <div className="flex flex-wrap justify-center gap-2">
            {primaryCta && (
              <Button
                asChild
                variant={primaryCta.variant ?? "default"}
                className={primaryCta.variant == null ? "bg-mystical text-white hover:opacity-90" : ""}
              >
                <Link to={primaryCta.to}>{primaryCta.label}</Link>
              </Button>
            )}
            {secondaryCta && (
              <Button asChild variant={secondaryCta.variant ?? "outline"}>
                <Link to={secondaryCta.to}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
