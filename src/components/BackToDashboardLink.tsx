import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Texto após a seta (ex.: «Voltar»). */
  label?: string;
  className?: string;
  /** Classes no `Button` wrapper (ex.: `mb-4`). */
  buttonClassName?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  /** Se false, não usa `Button` — só o link estilizado (ex.: Momento). */
  asButton?: boolean;
};

/** Link consistente para o painel principal (`/dashboard`). */
export function BackToDashboardLink({
  label = "Voltar",
  className,
  buttonClassName,
  variant = "ghost",
  size = "sm",
  asButton = true,
}: Props) {
  const inner = (
    <>
      <ArrowLeft className="mr-1 h-4 w-4 shrink-0" />
      {label}
    </>
  );
  if (!asButton) {
    return (
      <Link
        to="/dashboard"
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }
  return (
    <Button asChild variant={variant} size={size} className={cn("-ml-2 gap-1", buttonClassName)}>
      <Link to="/dashboard" className={className}>
        {inner}
      </Link>
    </Button>
  );
}
