import { forwardRef, memo } from "react";
import type { ChartData } from "@/lib/astrology/calculate";
import { NatalChartWheel } from "@/components/NatalChartWheel";

export type CardTheme = "noturno" | "crepusculo" | "cosmos";

export const CARD_THEMES: Record<CardTheme, { label: string; bg: string; gradient: string }> = {
  noturno: {
    label: "Noturno",
    bg: "#0f0a1a",
    gradient:
      "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(147,112,219,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(14,165,233,0.18), transparent 50%)",
  },
  crepusculo: {
    label: "Crepúsculo",
    bg: "#150a1f",
    gradient:
      "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(219,112,147,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(251,191,36,0.18), transparent 50%)",
  },
  cosmos: {
    label: "Cosmos",
    bg: "#050d1a",
    gradient:
      "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56,189,248,0.30), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(52,211,153,0.20), transparent 50%)",
  },
};

export type ShareableMomentCardProps = {
  displayName: string;
  identityLine: string;
  /** Frase curta gerada por IA (opcional). */
  essenceLine?: string;
  quoteLines: string[];
  dominantElement: string;
  purposeLine: string;
  /** Sorte do dia por signo solar (determinística por data). */
  luckToday?: string;
  /** Cor sugerida para o dia (rótulo + hex para PNG). */
  todayColor?: { label: string; hex: string };
  astroBullets: string[];
  brandHandle: string;
  /** URL curta para CTA viral (rodapé). */
  shareCtaUrl?: string;
  wheelData: ChartData;
  wheelSize?: number;
  theme?: { label: string; bg: string; gradient: string };
  showWheel?: boolean;
};

/** Dimensões típicas feed Instagram 4:5 (export PNG). */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const ShareableMomentCardInner = forwardRef<HTMLDivElement, ShareableMomentCardProps>(
  function ShareableMomentCard(
    {
      displayName,
      identityLine,
      essenceLine,
      quoteLines,
      dominantElement,
      purposeLine,
      luckToday,
      todayColor,
      astroBullets,
      brandHandle,
      shareCtaUrl,
      wheelData,
      wheelSize = 420,
      theme,
      showWheel = true,
    },
    ref,
  ) {
    const resolvedTheme = theme ?? CARD_THEMES.noturno;
    return (
      <div
        ref={ref}
        className="relative flex flex-col overflow-hidden rounded-none border border-white/10 text-white shadow-2xl"
        style={{
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          boxSizing: "border-box",
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          backgroundColor: resolvedTheme.bg,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          aria-hidden
          style={{ background: resolvedTheme.gradient }}
        />

        <div className="relative z-[1] flex flex-1 flex-col px-14 pb-12 pt-14">
          <p
            className="text-center font-display text-[52px] font-bold uppercase tracking-[0.22em] text-white drop-shadow-md"
            style={{ letterSpacing: "0.18em" }}
          >
            {displayName}
          </p>

          <p className="mt-8 text-center font-display text-[30px] font-medium leading-snug text-white/92">
            {identityLine}
          </p>

          {essenceLine ? (
            <p className="mt-6 max-w-[920px] text-center font-display text-[26px] font-normal italic leading-snug text-violet-200/90">
              {essenceLine}
            </p>
          ) : null}
          {essenceLine ? (
            <p className="mt-4 max-w-[920px] text-center font-display text-[18px] leading-snug text-white/42">
              Essência gerada por IA · reflexão simbólica
            </p>
          ) : null}

          <div className="mt-10 flex flex-1 flex-col items-center justify-start">
            {showWheel ? (
              <div className="rounded-full bg-black/25 p-4 ring-2 ring-white/15 shadow-inner">
                <NatalChartWheel data={wheelData} size={wheelSize} reduceMotion />
              </div>
            ) : null}

            {quoteLines.length > 0 ? (
              <blockquote className="mt-10 max-w-[920px] text-center font-display text-[34px] font-normal italic leading-[1.35] text-violet-100/95">
                {quoteLines.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </blockquote>
            ) : null}

            <div className="mt-10 w-full max-w-[920px] space-y-3 font-display text-[28px] leading-snug">
              <p className="text-white/90">
                <span className="font-semibold text-amber-100/90">Dominância:</span>{" "}
                <span className="uppercase tracking-wide text-white">{dominantElement}</span>
              </p>
              <p className="text-white/88">
                <span className="font-semibold text-amber-100/90">Propósito:</span>{" "}
                <span>{purposeLine}</span>
              </p>
              {luckToday ? (
                <p className="text-white/86">
                  <span className="font-semibold text-amber-100/90">Sorte:</span>{" "}
                  <span>{luckToday}</span>
                </p>
              ) : null}
              {todayColor ? (
                <div className="flex flex-wrap items-center gap-4 text-white/88">
                  <span className="font-semibold text-amber-100/90">Cor de hoje:</span>
                  <span
                    className="inline-block shrink-0 rounded-md ring-2 ring-white/25"
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: todayColor.hex,
                    }}
                    aria-hidden
                  />
                  <span className="font-normal">
                    {todayColor.label} <span className="text-white/65">({todayColor.hex})</span>
                  </span>
                </div>
              ) : null}
            </div>

            <ul className="mt-6 w-full max-w-[920px] list-none space-y-2 font-display text-[26px] leading-snug text-white/82">
              {astroBullets.map((line, i) => (
                <li key={i} className="border-l-2 border-violet-400/50 pl-4">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto space-y-6">
            {shareCtaUrl ? (
              <p className="text-center font-display text-[22px] leading-snug text-white/55">
                Monte o seu mapa em
                <br />
                <span className="break-all text-[20px] text-violet-200/85">{shareCtaUrl}</span>
              </p>
            ) : null}
            <div className="border-t border-white/15 pt-8 text-center font-display text-[24px] tracking-wide text-white/55">
              Criado em {brandHandle}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ShareableMomentCardInner.displayName = "ShareableMomentCard";

export const ShareableMomentCard = memo(ShareableMomentCardInner);
