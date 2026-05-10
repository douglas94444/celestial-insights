/**
 * Extrai o primeiro objeto JSON `{...}` da resposta do modelo (permite cercas ```json).
 *
 * **Contrato de segurança:** o valor é **não fiável** (saída do LLM). O chamador **deve** validar
 * com Zod (`safeParse`) imediatamente antes de ramificar negócio ou persistência — ver usos em
 * `ai-interpretation.functions.ts` e `synastry-deep-parse.ts`.
 */
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
