import { ASPECT_LABELS } from "./chart-detail-min.ts";
import type { TransitDayPayload } from "./transits.ts";
import { formatTransitDayTitle } from "./transits.ts";
import { PLANETS } from "./zodiac.ts";

function planetPt(k: string) {
  return PLANETS.find((p) => p.key === k)?.name ?? k;
}

export function buildTransitDigestHtml(chartName: string, day: TransitDayPayload): string {
  const title = formatTransitDayTitle(day.date);
  const aspectLines = day.aspects.slice(0, 12).map((a) => {
    return `<li>${planetPt(a.planet1)} (trânsito) ${ASPECT_LABELS[a.type]} ${planetPt(
      a.planet2,
    )} natal — orbe ${a.orb}°</li>`;
  });
  const hintsBlock =
    day.interpretiveHints.length > 0
      ? `<h2>Sugestões para reflexão</h2><ul>${day.interpretiveHints
          .slice(0, 5)
          .map((h) => `<li>${h}</li>`)
          .join("")}</ul>`
      : "";
  return `
      <h1>Trânsitos — ${chartName}</h1>
      <p><strong>${title}</strong></p>
      <p>Lua em trânsito: ${day.transitMoonSign || "—"} · Intensidade do dia (indicador): ${day.intensity}/100</p>
      <p>Sinais do dia (heurística — só reflexão): humor ${day.scores.humor}/100 · relações ${day.scores.amor}/100 · trabalho ${day.scores.trabalho}/100</p>
      <h2>Destaques</h2>
      <ul>${day.narrative.map((n) => `<li>${n}</li>`).join("")}</ul>
      ${hintsBlock}
      <h2>Aspectos trânsito × natal</h2>
      <ul>${aspectLines.join("")}</ul>
      <p style="margin-top:24px;font-size:12px;color:#666;">AstroMap · indicadores para reflexão, não substituem orientação profissional.</p>
    `;
}
