/** Extrai o primeiro objeto JSON `{...}` da resposta do modelo (permite cercas ```json). */
export function extractFirstJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(t);
  const candidate = fence ? fence[1]!.trim() : t;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new SyntaxError("JSON object não encontrado na resposta.");
  }
  const jsonSlice = candidate.slice(start, end + 1);
  return JSON.parse(jsonSlice) as unknown;
}
