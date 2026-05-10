import { describe, expect, it } from "vitest";
import { chartsListQueryKey } from "@/hooks/use-charts-list";

describe("charts list query", () => {
  it("mantém queryKey estável para cache partilhado", () => {
    expect(chartsListQueryKey).toEqual(["charts-list"]);
  });
});
