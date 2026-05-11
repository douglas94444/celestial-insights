import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentPropsWithoutRef } from "react";

type ButtonVariant = ComponentPropsWithoutRef<typeof Button>["variant"];

interface AiButtonProps {
  isPending: boolean;
  onClick: () => void;
  label: string;
  size?: "sm" | "md";
  variant?: ButtonVariant;
  className?: string;
  "aria-label"?: string;
}

export function AiButton({
  isPending,
  onClick,
  label,
  size = "md",
  variant = "outline",
  className,
  "aria-label": ariaLabel,
}: AiButtonProps) {
  const iconClass = size === "sm" ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4";
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      disabled={isPending}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {isPending ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : (
        <Sparkles className={iconClass} />
      )}
      {label}
    </Button>
  );
}
