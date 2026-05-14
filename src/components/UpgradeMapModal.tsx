import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREMIUM_BENEFITS = [
  "Mapas ilimitados — família, amigos, parceiros",
  "Sinastria e mapa composto entre quaisquer dois mapas",
  "Interpretações ilimitadas após a primeira semana guiada",
  "Previsão anual completa com picos e retrogradações",
  "Exportação PDF e cartão Instagram personalizados",
];

const MAPA_BENEFITS = [
  "Compre o mapa natal por R$ 37 (pagamento único, permanente)",
  "Roda natal interactiva completa",
  "Interpretações textuais para todos os planetas",
  "Sem mensalidade — pague uma vez e tenha para sempre",
];

/** Modal quando o utilizador tenta criar um segundo mapa antes do desbloqueio. */
export function UpgradeMapModal({ open, onOpenChange }: Props) {
  const { data: profile } = useProfile();
  const tier = profile?.subscription_tier ?? "FREE";
  const isMapaTier = tier === "MAPA";

  const title = isMapaTier ? "Mapas extras estão no Premium" : "Primeiro, obtenha o seu mapa natal";

  const benefits = isMapaTier ? PREMIUM_BENEFITS : MAPA_BENEFITS;

  const ctaLabel = isMapaTier ? "Ver planos Premium" : `Comprar mapa natal — R$ 37`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
        </AlertDialogHeader>

        <ul className="space-y-2 py-1">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isMapaTier ? (
            <Button asChild className="bg-mystical text-white">
              <Link to="/assinatura" onClick={() => onOpenChange(false)}>
                {ctaLabel}
              </Link>
            </Button>
          ) : (
            <Button asChild className="bg-mystical text-white">
              <Link
                to="/assinatura"
                search={{ produto: "mapa" }}
                onClick={() => onOpenChange(false)}
              >
                {ctaLabel}
              </Link>
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
