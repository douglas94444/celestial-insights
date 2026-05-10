import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readMomentStreak,
  seedLocalMomentStreakFromProfileIfAhead,
  touchMomentStreak,
} from "@/lib/moment-streak";

function mockLocalStorage() {
  const ls = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => {
      ls.set(k, v);
    },
    removeItem: (k: string) => {
      ls.delete(k);
    },
    clear: () => ls.clear(),
    key: () => null,
    get length() {
      return ls.size;
    },
  });
}

describe("moment streak", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("touchMomentStreak incrementa dias consecutivos", () => {
    mockLocalStorage();
    const d1 = touchMomentStreak({ overrideTodayYmd: "2026-06-01" });
    expect(d1.streak).toBe(1);
    const d2 = touchMomentStreak({ overrideTodayYmd: "2026-06-02" });
    expect(d2.streak).toBe(2);
    const again = touchMomentStreak({ overrideTodayYmd: "2026-06-02" });
    expect(again.streak).toBe(2);
  });

  it("touchMomentStreak reinicia após lacuna", () => {
    mockLocalStorage();
    touchMomentStreak({ overrideTodayYmd: "2026-06-01" });
    touchMomentStreak({ overrideTodayYmd: "2026-06-05" });
    expect(readMomentStreak().streak).toBe(1);
  });

  it("seedLocalMomentStreakFromProfileIfAhead sincroniza quando servidor está à frente", () => {
    mockLocalStorage();
    touchMomentStreak({ overrideTodayYmd: "2026-06-01" });
    seedLocalMomentStreakFromProfileIfAhead({
      moment_last_visit_ymd: "2026-06-10",
      moment_streak: 5,
    });
    const r = readMomentStreak();
    expect(r.lastVisitYmd).toBe("2026-06-10");
    expect(r.streak).toBe(5);
  });
});
