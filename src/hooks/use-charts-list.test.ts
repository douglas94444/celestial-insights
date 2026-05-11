import { describe, expect, it } from "vitest";
import { chartsQueryKeyBase } from "@/hooks/use-charts-list";

describe("charts list query", () => {
  it("mantém queryKey base estável para cache partilhado", () => {
    expect(chartsQueryKeyBase).toEqual(["charts"]);
  });
});
