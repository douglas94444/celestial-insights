const STORAGE_KEY = "astroMoment:lastVisitDate";
const STREAK_KEY = "astroMoment:streak";

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 12, 0, 0));
}

function diffUtcDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/** Data civil São Paulo (YYYY-MM-DD), igual ao trânsito diário. */
export function todayYmdSaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function readMomentStreak(): { streak: number; lastVisitYmd: string | null } {
  if (typeof window === "undefined") return { streak: 0, lastVisitYmd: null };
  try {
    const last = window.localStorage.getItem(STORAGE_KEY);
    const rawStreak = window.localStorage.getItem(STREAK_KEY);
    const streak = rawStreak ? Math.max(0, parseInt(rawStreak, 10) || 0) : 0;
    return { streak, lastVisitYmd: last };
  } catch {
    return { streak: 0, lastVisitYmd: null };
  }
}

/**
 * Chamar quando o utilizador abre o Momento (mapa existente).
 * Idempotente no mesmo dia civil SP.
 */
/** Se o servidor tem visita mais recente (ou mesmo dia com streak maior), alinha localStorage antes do touch. */
export function seedLocalMomentStreakFromProfileIfAhead(
  profile:
    | { moment_last_visit_ymd: string | null; moment_streak: number | null }
    | null
    | undefined,
): void {
  if (typeof window === "undefined" || !profile?.moment_last_visit_ymd) return;
  const local = readMomentStreak();
  const pLast = profile.moment_last_visit_ymd;
  const lLast = local.lastVisitYmd;
  const pStreak = Math.max(1, profile.moment_streak ?? 1);
  if (!lLast || pLast > lLast || (pLast === lLast && pStreak >= local.streak)) {
    try {
      window.localStorage.setItem(STORAGE_KEY, pLast);
      window.localStorage.setItem(STREAK_KEY, String(pStreak));
    } catch {
      /* quota */
    }
  }
}

export function touchMomentStreak(opts?: {
  /** Só para testes ou cenários controlados (YYYY-MM-DD). */
  overrideTodayYmd?: string;
}): { streak: number; lastVisitYmd: string } {
  const today = opts?.overrideTodayYmd ?? todayYmdSaoPaulo();
  if (typeof window === "undefined") return { streak: 1, lastVisitYmd: today };

  const prevVisit = window.localStorage.getItem(STORAGE_KEY);
  let streak = Math.max(1, parseInt(window.localStorage.getItem(STREAK_KEY) ?? "1", 10) || 1);

  if (prevVisit === today) {
    return { streak, lastVisitYmd: today };
  }

  if (!prevVisit) {
    streak = 1;
  } else {
    const a = parseYmd(today);
    const b = parseYmd(prevVisit);
    if (a && b) {
      const delta = diffUtcDays(a, b);
      if (delta === 1) streak += 1;
      else if (delta > 1) streak = 1;
    } else {
      streak = 1;
    }
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, today);
    window.localStorage.setItem(STREAK_KEY, String(streak));
  } catch {
    /* ignore quota */
  }

  return { streak, lastVisitYmd: today };
}
