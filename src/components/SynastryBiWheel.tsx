import { useMemo } from "react";
import { motion } from "framer-motion";
import { SIGNS, formatDegree, signFromLongitude } from "@/lib/astrology/zodiac";
import type { ChartData } from "@/lib/astrology/calculate";
import type { SynastryCrossAspect } from "@/lib/astrology/synastry";

const ASPECT_COLOR: Record<string, string> = {
  conjuncao: "var(--chart-aspect-conjuncao)",
  oposicao: "var(--chart-aspect-oposicao)",
  trigono: "var(--chart-aspect-trigono)",
  quadratura: "var(--chart-aspect-quadratura)",
  sextil: "var(--chart-aspect-sextil)",
};

function spreadLongitudes(longitudes: { key: string; longitude: number }[]) {
  const sorted = [...longitudes].sort((a, b) => a.longitude - b.longitude);
  const adjusted: Record<string, number> = {};
  let lastLon = -999;
  for (const p of sorted) {
    let lon = p.longitude;
    if (Math.abs(lon - lastLon) < 6) lon = lastLon + 6;
    adjusted[p.key] = lon;
    lastLon = lon;
  }
  return adjusted;
}

interface Props {
  /** Mapa da roda externa (casas e signos alinhados a este ASC). */
  baseChart: ChartData;
  /** Segunda pessoa — planetas na faixa interior. */
  overlayChart: ChartData;
  synastryAspects: SynastryCrossAspect[];
  size?: number;
}

export function SynastryBiWheel({ baseChart, overlayChart, synastryAspects, size = 520 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rSigns = rOuter - 4;
  const rSignsInner = rSigns - 36;
  const rHouses = rSignsInner;
  const rHousesInner = rHouses - 50;
  const rPlanetsOuter = rHousesInner - 28;
  const rPlanetsInner = rPlanetsOuter - 52;
  const ascendant = baseChart.ascendant;

  const lonToAngle = (lon: number) => {
    const rel = (((lon - ascendant) % 360) + 360) % 360;
    const angle = 180 - rel;
    return (angle * Math.PI) / 180;
  };

  const polar = (r: number, lon: number) => {
    const a = lonToAngle(lon);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };

  const positionsOuter = useMemo(
    () => spreadLongitudes(baseChart.planets.map((p) => ({ key: p.key, longitude: p.longitude }))),
    [baseChart.planets],
  );
  const positionsInner = useMemo(
    () =>
      spreadLongitudes(overlayChart.planets.map((p) => ({ key: p.key, longitude: p.longitude }))),
    [overlayChart.planets],
  );

  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto max-w-[560px]"
    >
      <defs>
        <radialGradient id="synGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="var(--chart-radial-inner)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={rOuter} fill="url(#synGlow)" />

      <circle
        cx={cx}
        cy={cy}
        r={rSigns}
        fill="none"
        stroke="var(--chart-ring-line)"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r={rSignsInner}
        fill="none"
        stroke="var(--chart-ring-line)"
        strokeWidth="1"
      />

      {SIGNS.map((sign, i) => {
        const startLon = i * 30;
        const midLon = startLon + 15;
        const a1 = lonToAngle(startLon);
        const x1 = cx + rSignsInner * Math.cos(a1);
        const y1 = cy - rSignsInner * Math.sin(a1);
        const x2 = cx + rSigns * Math.cos(a1);
        const y2 = cy - rSigns * Math.sin(a1);
        const labelPos = polar((rSigns + rSignsInner) / 2, midLon);
        return (
          <g key={sign.name}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--chart-ring-line)" strokeWidth="1" />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="19"
              fill={sign.color}
              fontWeight="600"
            >
              {sign.symbol}
            </text>
          </g>
        );
      })}

      <circle
        cx={cx}
        cy={cy}
        r={rHousesInner}
        fill="none"
        stroke="var(--chart-house-ring)"
        strokeWidth="1"
      />

      {baseChart.houses.map((house, i) => {
        const a = lonToAngle(house.cusp);
        const x1 = cx + rHousesInner * Math.cos(a);
        const y1 = cy - rHousesInner * Math.sin(a);
        const x2 = cx + rHouses * Math.cos(a);
        const y2 = cy - rHouses * Math.sin(a);
        const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
        const next = baseChart.houses[(i + 1) % 12];
        let midLon = (house.cusp + next.cusp) / 2;
        if (next.cusp < house.cusp) midLon = (house.cusp + next.cusp + 360) / 2;
        const labelPos = polar((rHouses + rHousesInner) / 2, midLon);
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isAngular ? "var(--chart-line-angular)" : "var(--chart-house-ring)"}
              strokeWidth={isAngular ? "2" : "1"}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--chart-label-muted)"
            >
              {house.number}
            </text>
          </g>
        );
      })}

      <text x={cx} y={22} textAnchor="middle" fontSize="11" fill="var(--chart-line-angular)">
        Sinastria · casas do mapa exterior
      </text>

      {/* Pontes de aspectos entre os dois conjuntos de planetas */}
      <g opacity="0.65">
        {synastryAspects.map((aspect, idx) => {
          const pOuter = baseChart.planets.find((p) => p.key === aspect.planet1);
          const pInner = overlayChart.planets.find((p) => p.key === aspect.planet2);
          if (!pOuter || !pInner) return null;
          const lonO = positionsOuter[pOuter.key] ?? pOuter.longitude;
          const lonI = positionsInner[pInner.key] ?? pInner.longitude;
          const a = polar(rPlanetsOuter, lonO);
          const b = polar(rPlanetsInner, lonI);
          return (
            <line
              key={idx}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={ASPECT_COLOR[aspect.type]}
              strokeWidth={aspect.type === "conjuncao" ? "1.35" : "1"}
              strokeOpacity="0.55"
              strokeDasharray={
                aspect.type === "quadratura" || aspect.type === "oposicao" ? "3 3" : undefined
              }
            />
          );
        })}
      </g>

      {/* Planetas mapa base — anel exterior */}
      {baseChart.planets.map((planet) => {
        const lon = positionsOuter[planet.key] ?? planet.longitude;
        const pos = polar(rPlanetsOuter, lon);
        const tickStart = polar(rHousesInner, planet.longitude);
        const tickEnd = polar(rPlanetsOuter + 16, planet.longitude);
        return (
          <g key={`o-${planet.key}`}>
            <line
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="var(--chart-tick)"
              strokeWidth="1"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={13}
              fill="var(--chart-planet-fill)"
              stroke="var(--chart-planet-stroke)"
              strokeWidth="1.5"
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fill="var(--chart-planet-text)"
              fontWeight="600"
            >
              {planet.symbol}
            </text>
            <title>
              {planet.name} (mapa exterior) · {planet.sign} · {formatDegree(planet.longitude)}
            </title>
          </g>
        );
      })}

      {/* Planetas mapa interior */}
      {overlayChart.planets.map((planet) => {
        const lon = positionsInner[planet.key] ?? planet.longitude;
        const pos = polar(rPlanetsInner, lon);
        return (
          <g key={`i-${planet.key}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={12}
              fill="var(--chart-syn-inner-fill)"
              stroke="var(--chart-syn-inner-stroke)"
              strokeWidth="1.8"
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="var(--chart-syn-inner-text)"
              fontWeight="700"
            >
              {planet.symbol}
            </text>
            <title>
              {planet.name} (mapa interior) · {planet.sign} · {formatDegree(planet.longitude)}
            </title>
          </g>
        );
      })}

      <g>
        {(() => {
          const pos = polar(rOuter, ascendant);
          return (
            <>
              <text
                x={pos.x - 18}
                y={pos.y + 4}
                fontSize="11"
                fill="var(--chart-line-angular)"
                fontWeight="700"
              >
                ASC
              </text>
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--chart-label-muted)"
              >
                {signFromLongitude(ascendant)}
              </text>
              <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                fontSize="10"
                fill="var(--chart-center-caption)"
              >
                ASC {formatDegree(ascendant)}
              </text>
            </>
          );
        })()}
      </g>
    </motion.svg>
  );
}
