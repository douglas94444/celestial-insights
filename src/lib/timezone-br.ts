/** Principais offsets do Brasil (minutos a leste de UTC). */
export const BRAZIL_TIMEZONE_OFFSETS = [
  { label: "UTC−5 (Acre)", minutes: -300 },
  { label: "UTC−4 (Amazonas, Roraima)", minutes: -240 },
  { label: "UTC−3 (maior parte do Brasil)", minutes: -180 },
  { label: "UTC−2 (Fernando de Noronha)", minutes: -120 },
] as const;

export function formatTimezoneLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const h = offsetMinutes / 60;
  return h > 0 ? `UTC+${h}` : `UTC${h}`;
}

/** Inverte o rótulo gerado por `formatTimezoneLabel` (mapas antigos sem offset guardado). */
export function parseTimezoneLabelToMinutes(label: string): number | null {
  const s = label.trim();
  if (s === "UTC") return 0;
  const m = s.match(/^UTC([+-]?\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const hours = parseFloat(m[1]);
  if (Number.isNaN(hours)) return null;
  return Math.round(hours * 60);
}
