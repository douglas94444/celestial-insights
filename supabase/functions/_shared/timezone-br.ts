/** Inverte o rótulo UTC±h (mapas antigos sem offset guardado). */
export function parseTimezoneLabelToMinutes(label: string): number | null {
  const s = label.trim();
  if (s === "UTC") return 0;
  const m = s.match(/^UTC([+-]?\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const hours = parseFloat(m[1]);
  if (Number.isNaN(hours)) return null;
  return Math.round(hours * 60);
}
