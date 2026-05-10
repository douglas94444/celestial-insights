export const SIGNS = [
  { name: "Áries", short: "Ari", symbol: "♈", element: "Fogo", color: "#E11D48" },
  { name: "Touro", short: "Tou", symbol: "♉", element: "Terra", color: "#65A30D" },
  { name: "Gêmeos", short: "Gem", symbol: "♊", element: "Ar", color: "#EAB308" },
  { name: "Câncer", short: "Can", symbol: "♋", element: "Água", color: "#06B6D4" },
  { name: "Leão", short: "Leo", symbol: "♌", element: "Fogo", color: "#F97316" },
  { name: "Virgem", short: "Vir", symbol: "♍", element: "Terra", color: "#16A34A" },
  { name: "Libra", short: "Lib", symbol: "♎", element: "Ar", color: "#FACC15" },
  { name: "Escorpião", short: "Esc", symbol: "♏", element: "Água", color: "#7C3AED" },
  { name: "Sagitário", short: "Sag", symbol: "♐", element: "Fogo", color: "#DC2626" },
  { name: "Capricórnio", short: "Cap", symbol: "♑", element: "Terra", color: "#4D7C0F" },
  { name: "Aquário", short: "Aqu", symbol: "♒", element: "Ar", color: "#0EA5E9" },
  { name: "Peixes", short: "Pei", symbol: "♓", element: "Água", color: "#8B5CF6" },
] as const;

export type SignName = (typeof SIGNS)[number]["name"];

export const PLANETS = [
  { key: "sun", name: "Sol", symbol: "☉" },
  { key: "moon", name: "Lua", symbol: "☽" },
  { key: "mercury", name: "Mercúrio", symbol: "☿" },
  { key: "venus", name: "Vênus", symbol: "♀" },
  { key: "mars", name: "Marte", symbol: "♂" },
  { key: "jupiter", name: "Júpiter", symbol: "♃" },
  { key: "saturn", name: "Saturno", symbol: "♄" },
  { key: "uranus", name: "Urano", symbol: "♅" },
  { key: "neptune", name: "Netuno", symbol: "♆" },
  { key: "pluto", name: "Plutão", symbol: "♇" },
] as const;

export type PlanetKey = (typeof PLANETS)[number]["key"];

export function signFromLongitude(lon: number): SignName {
  const normalized = ((lon % 360) + 360) % 360;
  const idx = Math.floor(normalized / 30);
  return SIGNS[idx].name;
}

export function signIndexFromLongitude(lon: number): number {
  const normalized = ((lon % 360) + 360) % 360;
  return Math.floor(normalized / 30);
}

export function degreeInSign(lon: number): number {
  const normalized = ((lon % 360) + 360) % 360;
  return normalized % 30;
}

export function formatDegree(lon: number): string {
  const deg = degreeInSign(lon);
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}° ${m.toString().padStart(2, "0")}'`;
}
