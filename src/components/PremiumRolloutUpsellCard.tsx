import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PremiumRolloutUpsellCardProps = {
  title: string;
  description: string;
  className?: string;
};

export function PremiumRolloutUpsellCard({
  title,
  description,
  className,
}: PremiumRolloutUpsellCardProps) {
  return (
    <Card className={`border-primary/25 bg-primary/5 shadow-soft ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Crown className="h-5 w-5 text-primary" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{description}</p>
        <Button asChild variant="outline" className="border-primary/30 hover:bg-primary/5">
          <Link to="/planos">Ver planos Premium</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
