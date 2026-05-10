const STORAGE_KEY = "astroMoment:history:v1";
const MAX_ENTRIES = 30;

export type MomentHistorySnapshot = {
  visitYmd: string;
  savedAt: string;
  quoteLines: string[];
  luckLine?: string;
  colorLabel?: string;
  colorHex?: string;
  /** Seed estável (Lua/intensidade), igual ao cartão desse dia. */
  transitFingerprint?: string;
  /** Bucket 0–3 para hashtags consistentes. */
  intensityBucket?: number;
  /** Primeira linha da narrativa de trânsito, se existia. */
  transitSnippet?: string;
  aiText?: string | null;
};

type StoredPayload = { entries: MomentHistorySnapshot[] };

function parseStored(raw: string | null): MomentHistorySnapshot[] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw) as StoredPayload;
    if (!j || !Array.isArray(j.entries)) return [];
    return j.entries
      .filter(
        (e) =>
          e &&
          typeof e.visitYmd === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(e.visitYmd) &&
          Array.isArray(e.quoteLines),
      )
      .map((e) => ({
        visitYmd: e.visitYmd,
        savedAt: typeof e.savedAt === "string" ? e.savedAt : new Date().toISOString(),
        quoteLines: e.quoteLines.filter((x) => typeof x === "string"),
        luckLine: typeof e.luckLine === "string" ? e.luckLine : undefined,
        colorLabel: typeof e.colorLabel === "string" ? e.colorLabel : undefined,
        colorHex: typeof e.colorHex === "string" ? e.colorHex : undefined,
        transitFingerprint:
          typeof e.transitFingerprint === "string" ? e.transitFingerprint : undefined,
        intensityBucket:
          typeof e.intensityBucket === "number" && Number.isFinite(e.intensityBucket)
            ? e.intensityBucket
            : undefined,
        transitSnippet: typeof e.transitSnippet === "string" ? e.transitSnippet : undefined,
        aiText: typeof e.aiText === "string" || e.aiText === null ? e.aiText : undefined,
      }));
  } catch {
    return [];
  }
}

export function loadMomentHistory(): MomentHistorySnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const list = parseStored(window.localStorage.getItem(STORAGE_KEY));
    return [...list].sort((a, b) =>
      a.visitYmd < b.visitYmd ? 1 : a.visitYmd > b.visitYmd ? -1 : 0,
    );
  } catch {
    return [];
  }
}

/** Grava ou substitui entrada do dia; mantém no máximo MAX_ENTRIES mais recentes por visitYmd. */
export function upsertMomentHistory(entry: MomentHistorySnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const cur = parseStored(window.localStorage.getItem(STORAGE_KEY));
    const others = cur.filter((e) => e.visitYmd !== entry.visitYmd);
    const next = [{ ...entry, savedAt: entry.savedAt || new Date().toISOString() }, ...others]
      .sort((a, b) => (a.visitYmd < b.visitYmd ? 1 : a.visitYmd > b.visitYmd ? -1 : 0))
      .slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: next }));
  } catch {
    /* quota */
  }
}

export function getMomentHistoryEntry(visitYmd: string): MomentHistorySnapshot | undefined {
  return loadMomentHistory().find((e) => e.visitYmd === visitYmd);
}
