import { ASPECT_LABELS } from "./chart-detail-min.ts";
import { escapeHtml } from "./html-escape.ts";
import type { TransitDayPayload } from "./transits.ts";
import { formatTransitDayTitle } from "./transits.ts";
import { PLANETS } from "./zodiac.ts";

function planetPt(k: string) {
  return PLANETS.find((p) => p.key === k)?.name ?? k;
}

export function buildTransitDigestHtml(chartName: string, day: TransitDayPayload): string {
  const title = formatTransitDayTitle(day.date);
  const aspectLines = day.aspects.slice(0, 12).map((a) => {
    const p1 = escapeHtml(planetPt(a.planet1));
    const p2 = escapeHtml(planetPt(a.planet2));
    const aspectLabel = escapeHtml(ASPECT_LABELS[a.type] ?? String(a.type));
    const orb = escapeHtml(String(a.orb));
    return `<li>${p1} (trânsito) ${aspectLabel} ${p2} natal — orbe ${orb}°</li>`;
  });
  const hintsBlock =
    day.interpretiveHints.length > 0
      ? `<h2>Sugestões para reflexão</h2><ul>${day.interpretiveHints
          .slice(0, 5)
          .map((h) => `<li>${escapeHtml(h)}</li>`)
          .join("")}</ul>`
      : "";
  const moon = escapeHtml(day.transitMoonSign || "—");
  return `
      <h1>Trânsitos — ${escapeHtml(chartName)}</h1>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p>Lua em trânsito: ${moon} · Intensidade do dia (indicador): ${day.intensity}/100</p>
      <p>Sinais do dia (heurística — só reflexão): humor ${day.scores.humor}/100 · relações ${day.scores.amor}/100 · trabalho ${day.scores.trabalho}/100</p>
      <h2>Destaques</h2>
      <ul>${day.narrative.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      ${hintsBlock}
      <h2>Aspectos trânsito × natal</h2>
      <ul>${aspectLines.join("")}</ul>
      <p style="margin-top:24px;font-size:12px;color:#666;">AstroMap · indicadores para reflexão, não substituem orientação profissional.</p>
    `;
}
