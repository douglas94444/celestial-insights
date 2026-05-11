import { z } from "zod";

const STORAGE_KEY = "astroMoment:history:v1";
const MAX_ENTRIES = 30;

const momentHistorySnapshotSchema = z.object({
  visitYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  savedAt: z.string().optional(),
  quoteLines: z.array(z.string()),
  luckLine: z.string().optional(),
  colorLabel: z.string().optional(),
  colorHex: z.string().optional(),
  transitFingerprint: z.string().optional(),
  intensityBucket: z.number().finite().optional(),
  transitSnippet: z.string().optional(),
  aiText: z.union([z.string(), z.null()]).optional(),
});

const storedPayloadSchema = z.object({
  entries: z.array(momentHistorySnapshotSchema),
});

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

function parseStored(raw: string | null): MomentHistorySnapshot[] {
  if (!raw) return [];
  try {
    const parsed = storedPayloadSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.entries.map((e) => ({
      visitYmd: e.visitYmd,
      savedAt: e.savedAt ?? new Date().toISOString(),
      quoteLines: e.quoteLines,
      luckLine: e.luckLine,
      colorLabel: e.colorLabel,
      colorHex: e.colorHex,
      transitFingerprint: e.transitFingerprint,
      intensityBucket: e.intensityBucket,
      transitSnippet: e.transitSnippet,
      aiText: e.aiText,
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
