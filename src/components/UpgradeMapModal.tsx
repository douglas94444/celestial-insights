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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREMIUM_BENEFITS = [
  "Mapas ilimitados (família, amigos, parceiros)",
  "Sinastria e mapa composto entre quaisquer dois mapas",
  "Interpretações IA ilimitadas após a primeira semana guiada",
  "Previsão anual completa com picos e retrogradações",
  "Exportação PDF e cartão Instagram personalizados",
];

/** Modal quando o utilizador tenta criar um segundo mapa antes do desbloqueio (paywall placeholder). */
export function UpgradeMapModal({ open, onOpenChange }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Mais mapas nos planos</AlertDialogTitle>
        </AlertDialogHeader>

        <ul className="space-y-2 py-1">
          {PREMIUM_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Checkout em preparação — em breve disponível na página de planos.
        </p>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button asChild className="bg-mystical text-white">
            <Link to="/premium" onClick={() => onOpenChange(false)}>
              Ver planos
            </Link>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
