export type MomentCaptionPreset = "short" | "medium" | "full" | "essence";

/** Limite macio para legendas no Instagram (~2200); texto final é cortado em `buildMomentShareCaption`. */
export const INSTAGRAM_CAPTION_SOFT_CAP = 2200;

export function clipCaptionForInstagram(raw: string, maxLen = INSTAGRAM_CAPTION_SOFT_CAP): string {
  const t = raw.trimEnd();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

export type MomentShareCaptionInput = {
  titleFirstName: string;
  luckLine?: string;
  colorLabel?: string;
  colorHex?: string;
  /** Linha curta da essência do mapa (IA cacheada), alinhada ao cartão. */
  essenceLine?: string;
  /**
   * Gancho do dia a partir de dados já calculados (ex.: 1.ª linha da narrativa de trânsito).
   * Omitido se for redundante com `luckLine`.
   */
  transitHookLine?: string;
  brandHandle: string;
  shareUrl?: string | null;
  /** Predefinição «medium» equilibra linhas úteis para redes sociais. */
  preset?: MomentCaptionPreset;
  /** Hashtags sem `#`; são prefixadas na saída. */
  hashtags?: readonly string[];
};

function clipCaptionText(raw: string, maxLen: number): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function normCaptionLine(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Hash determinístico FNV-1a (32-bit) para picks estáveis. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  return hash32(seed) % modulo;
}

const THEME_POOLS = {
  base: [
    "AstroMap",
    "MomentoComOCeu",
    "Astrologia",
    "MapaNatal",
    "Autoconhecimento",
    "HoroscopoDoDia",
  ],
  fire: ["ElementoFogo", "Energia", "CoragemSuave"],
  earth: ["ElementoTerra", "Presenca", "Raizes"],
  air: ["ElementoAr", "IdeiasClaras", "Comunicacao"],
  water: ["ElementoAgua", "EscutaInterior", "Emocoes"],
  calm: ["DiaLeve", "Respira", "MomentoPresente"],
  intense: ["DiaIntenso", "TransformacaoSuave", "OlharInterior"],
} as const;

export type MomentHashtagSeed = {
  sunSignLabel: string;
  dateStr: string;
  transitFingerprint?: string;
  dominantElement?: string;
  intensityBucket?: number;
};

/** 5–8 hashtags PT-BR sem acentos para Instagram; estáveis no mesmo dia com o mesmo seed. */
export function suggestedMomentHashtags(seed: MomentHashtagSeed): string[] {
  const fp = seed.transitFingerprint ?? "nofp";
  const el = (seed.dominantElement ?? "").toLowerCase();
  const bucket = seed.intensityBucket ?? 0;
  const baseSeed = `${seed.sunSignLabel}|${seed.dateStr}|${fp}|tags`;

  const pool: string[] = [...THEME_POOLS.base];
  pool.push(...(bucket >= 3 ? THEME_POOLS.intense : THEME_POOLS.calm));
  if (el.includes("fogo")) pool.push(...THEME_POOLS.fire);
  else if (el.includes("terra")) pool.push(...THEME_POOLS.earth);
  else if (el.includes("ar")) pool.push(...THEME_POOLS.air);
  else if (el.includes("água") || el.includes("agua")) pool.push(...THEME_POOLS.water);

  const signSlug = seed.sunSignLabel.replace(/\s+/g, "").trim();
  if (signSlug) pool.push(signSlug);

  const picks = new Set<string>();
  for (let i = 0; picks.size < 8 && i < 48; i++) {
    if (!pool.length) break;
    const idx = pickIndex(`${baseSeed}|${i}`, pool.length);
    const raw = pool[idx];
    if (raw) picks.add(raw.replace(/^#/, ""));
  }
  return [...picks];
}

/** Texto para colar na legenda do Instagram (Markdown-free). */
export function buildMomentShareCaption(input: MomentShareCaptionInput): string {
  const preset = input.preset ?? "medium";
  const lines: string[] = [];
  const luck = input.luckLine?.trim();
  const colorOk = input.colorLabel?.trim() && input.colorHex?.trim();
  const url = input.shareUrl?.trim();

  const essence = input.essenceLine?.trim() ? clipCaptionText(input.essenceLine, 200) : "";
  let hookRaw = input.transitHookLine?.trim() ? clipCaptionText(input.transitHookLine, 160) : "";
  if (hookRaw && luck && normCaptionLine(hookRaw) === normCaptionLine(luck)) {
    hookRaw = "";
  }

  if (preset === "short") {
    lines.push(`Momento com o céu — ${input.titleFirstName}`);
    if (luck) lines.push(`Sorte: ${luck}`);
    if (essence) lines.push(`Essência do mapa: ${essence}`);
    if (hookRaw) lines.push(`Linhagem do céu hoje: ${hookRaw}`);
    lines.push(input.brandHandle);
  } else if (preset === "essence") {
    lines.push(`Momento com o céu — ${input.titleFirstName}`);
    if (essence) lines.push(`Essência do mapa: ${essence}`);
    if (hookRaw) lines.push(`Contexto simbólico do dia: ${hookRaw}`);
    lines.push(`Criado em ${input.brandHandle}`);
    if (url) lines.push(`Monte o seu mapa: ${url}`);
  } else if (preset === "medium") {
    lines.push(`Momento com o céu — ${input.titleFirstName}`);
    if (luck) lines.push(`Sorte do dia: ${luck}`);
    if (colorOk) {
      lines.push(`Cor de hoje: ${input.colorLabel!.trim()} (${input.colorHex!.trim()})`);
    }
    if (essence) lines.push(`Essência do mapa: ${essence}`);
    if (hookRaw) lines.push(`Contexto simbólico do dia: ${hookRaw}`);
    lines.push(`Criado em ${input.brandHandle}`);
    if (url) lines.push(`Monte o seu mapa: ${url}`);
  } else {
    lines.push(`Momento com o céu — ${input.titleFirstName}`);
    if (luck) lines.push(`Sorte do dia: ${luck}`);
    if (colorOk) {
      lines.push(`Cor de hoje: ${input.colorLabel!.trim()} (${input.colorHex!.trim()})`);
    }
    if (essence) lines.push(`Essência do mapa: ${essence}`);
    if (hookRaw) lines.push(`Contexto simbólico do dia: ${hookRaw}`);
    lines.push(`Um gesto de presença com o mapa natal — reflexão simbólica, sem fatalismo.`);
    lines.push(`Criado em ${input.brandHandle}`);
    if (url) {
      lines.push(`Monte o seu mapa: ${url}`);
      lines.push(`Link acima para criar o seu próprio mapa no AstroMap.`);
    }
  }

  let body = lines.join("\n");
  if (input.hashtags && input.hashtags.length > 0) {
    const ht = input.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    body = `${body}\n\n${ht}`;
  }
  return clipCaptionForInstagram(body);
}
