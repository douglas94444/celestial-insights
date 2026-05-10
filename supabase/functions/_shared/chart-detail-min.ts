import type { AspectType } from "./calculate.ts";

export const ASPECT_LABELS: Record<AspectType, string> = {
  conjuncao: "Conjunção",
  oposicao: "Oposição",
  trigono: "Trígono",
  quadratura: "Quadratura",
  sextil: "Sextil",
};

export type AspectMood = "harmonic" | "desafiador" | "neutro";

export function aspectMood(type: AspectType): AspectMood {
  if (type === "trigono" || type === "sextil") return "harmonic";
  if (type === "quadratura" || type === "oposicao") return "desafiador";
  return "neutro";
}
