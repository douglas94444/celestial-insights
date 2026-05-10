import { useMemo } from "react";
import { motion } from "framer-motion";
import { SIGNS, PLANETS, formatDegree, signFromLongitude } from "@/lib/astrology/zodiac";
import type { ChartData } from "@/lib/astrology/calculate";

interface Props {
  data: ChartData;
  size?: number;
  highlightPlanet?: string;
  onPlanetClick?: (planet: string) => void;
}

const ASPECT_COLOR: Record<string, string> = {
  conjuncao: "oklch(0.78 0.16 80)",
  oposicao: "oklch(0.55 0.22 295)",
  trigono: "oklch(0.62 0.18 250)",
  quadratura: "oklch(0.58 0.24 27)",
  sextil: "oklch(0.65 0.18 145)",
};

export function NatalChartWheel({ data, size = 520, highlightPlanet, onPlanetClick }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rSigns = rOuter - 4;
  const rSignsInner = rSigns - 36;
  const rHouses = rSignsInner;
  const rHousesInner = rHouses - 50;
  const rPlanets = rHousesInner - 22;
  const rAspects = rPlanets - 26;

  const ascendant = data.ascendant;

  // Convert ecliptic longitude to SVG angle.
  // Ascendant at left (180° in SVG), zodiac going counter-clockwise.
  const lonToAngle = (lon: number) => {
    // shift so Asc is at left (pi rad = 180°)
    const rel = (((lon - ascendant) % 360) + 360) % 360;
    // Counter-clockwise from left horizon
    const angle = 180 - rel;
    return (angle * Math.PI) / 180;
  };

  const polar = (r: number, lon: number) => {
    const a = lonToAngle(lon);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };

  // Spread overlapping planets a little
  const planetPositions = useMemo(() => {
    const sorted = [...data.planets].sort((a, b) => a.longitude - b.longitude);
    const adjusted: Record<string, number> = {};
    let lastLon = -999;
    for (const p of sorted) {
      let lon = p.longitude;
      if (Math.abs(lon - lastLon) < 6) lon = lastLon + 6;
      adjusted[p.key] = lon;
      lastLon = lon;
    }
    return adjusted;
  }, [data.planets]);

  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto max-w-[600px]"
    >
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.68 0.20 295 / 0.18)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={rOuter} fill="url(#bgGlow)" />

      {/* Sign ring */}
      <circle
        cx={cx}
        cy={cy}
        r={rSigns}
        fill="none"
        stroke="oklch(0.60 0.10 280)"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r={rSignsInner}
        fill="none"
        stroke="oklch(0.60 0.10 280)"
        strokeWidth="1"
      />

      {/* Sign sectors */}
      {SIGNS.map((sign, i) => {
        const startLon = i * 30;
        const midLon = startLon + 15;
        const a1 = lonToAngle(startLon);
        const a2 = lonToAngle(startLon + 30);
        // tick line at boundary
        const x1 = cx + rSignsInner * Math.cos(a1);
        const y1 = cy - rSignsInner * Math.sin(a1);
        const x2 = cx + rSigns * Math.cos(a1);
        const y2 = cy - rSigns * Math.sin(a1);
        const labelPos = polar((rSigns + rSignsInner) / 2, midLon);
        return (
          <g key={sign.name}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.60 0.10 280)" strokeWidth="1" />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="20"
              fill={sign.color}
              fontWeight="600"
            >
              {sign.symbol}
            </text>
          </g>
        );
      })}

      {/* House ring */}
      <circle
        cx={cx}
        cy={cy}
        r={rHousesInner}
        fill="none"
        stroke="oklch(0.55 0.05 280 / 0.5)"
        strokeWidth="1"
      />

      {/* House cusps */}
      {data.houses.map((house, i) => {
        const a = lonToAngle(house.cusp);
        const x1 = cx + rHousesInner * Math.cos(a);
        const y1 = cy - rHousesInner * Math.sin(a);
        const x2 = cx + rHouses * Math.cos(a);
        const y2 = cy - rHouses * Math.sin(a);
        const isAngular = i === 0 || i === 3 || i === 6 || i === 9;
        const next = data.houses[(i + 1) % 12];
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
              stroke={isAngular ? "oklch(0.52 0.22 295)" : "oklch(0.55 0.05 280 / 0.5)"}
              strokeWidth={isAngular ? "2" : "1"}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill="oklch(0.50 0.04 280)"
            >
              {house.number}
            </text>
          </g>
        );
      })}

      {/* Aspects */}
      <g opacity="0.7">
        {data.aspects.map((aspect, idx) => {
          const p1 = data.planets.find((p) => p.key === aspect.planet1);
          const p2 = data.planets.find((p) => p.key === aspect.planet2);
          if (!p1 || !p2) return null;
          const a = polar(rAspects, p1.longitude);
          const b = polar(rAspects, p2.longitude);
          return (
            <line
              key={idx}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={ASPECT_COLOR[aspect.type]}
              strokeWidth={aspect.type === "conjuncao" ? "1.5" : "1"}
              strokeOpacity="0.5"
              strokeDasharray={
                aspect.type === "quadratura" || aspect.type === "oposicao" ? "3 3" : undefined
              }
            />
          );
        })}
      </g>

      {/* Planets */}
      {data.planets.map((planet) => {
        const lon = planetPositions[planet.key] ?? planet.longitude;
        const pos = polar(rPlanets, lon);
        const tickStart = polar(rHousesInner, planet.longitude);
        const tickEnd = polar(rPlanets + 14, planet.longitude);
        const isHl = highlightPlanet === planet.key;
        return (
          <g
            key={planet.key}
            style={{ cursor: onPlanetClick ? "pointer" : "default" }}
            onClick={() => onPlanetClick?.(planet.key)}
          >
            <line
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="oklch(0.55 0.10 280 / 0.4)"
              strokeWidth="1"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHl ? 16 : 13}
              fill="oklch(0.99 0.01 280)"
              stroke={isHl ? "oklch(0.78 0.16 80)" : "oklch(0.52 0.22 295)"}
              strokeWidth={isHl ? "2.5" : "1.5"}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="14"
              fill="oklch(0.30 0.12 280)"
              fontWeight="600"
            >
              {planet.symbol}
            </text>
            <title>
              {planet.name} · {planet.sign} · {formatDegree(planet.longitude)} · Casa {planet.house}
              {planet.retrograde ? " (R)" : ""}
            </title>
          </g>
        );
      })}

      {/* ASC marker */}
      <g>
        {(() => {
          const pos = polar(rOuter, ascendant);
          return (
            <>
              <text
                x={pos.x - 16}
                y={pos.y + 4}
                fontSize="11"
                fill="oklch(0.52 0.22 295)"
                fontWeight="700"
              >
                ASC
              </text>
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="oklch(0.50 0.04 280)">
                {signFromLongitude(ascendant)}
              </text>
              <text
                x={cx}
                y={cy + 10}
                textAnchor="middle"
                fontSize="10"
                fill="oklch(0.55 0.05 280)"
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
