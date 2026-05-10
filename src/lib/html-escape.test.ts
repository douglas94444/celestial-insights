import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("neutraliza marcadores HTML", () => {
    expect(escapeHtml('a<b>"c"&\'')).toBe("a&lt;b&gt;&quot;c&quot;&amp;&#39;");
  });

  it("mantém texto seguro", () => {
    expect(escapeHtml("Sol em Leão")).toBe("Sol em Leão");
  });
});
