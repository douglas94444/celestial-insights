import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Modal quando usuário FREE tenta criar um segundo mapa (paywall placeholder). */
export function UpgradeMapModal({ open, onOpenChange }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Mais mapas com Premium</AlertDialogTitle>
          <AlertDialogDescription>
            No plano gratuito você pode guardar um mapa natal. Para criar perfis adicionais
            (família, estudos, etc.), o Premium será ativado quando ligarmos o checkout — na página
            Planos Premium você vê o resumo honesto do que já existe e do que virá.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button asChild className="bg-mystical text-white">
            <Link to="/premium" onClick={() => onOpenChange(false)}>
              Ver benefícios Premium
            </Link>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
