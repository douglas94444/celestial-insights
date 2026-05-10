/** Chamadas LLM apenas no servidor (nunca expor chaves ao cliente). */

export type AiProviderId = "anthropic" | "openai";

export interface CompleteChatResult {
  text: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}

function resolveProviderExplicit(): AiProviderId | null {
  const v = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (v === "anthropic" || v === "openai") return v;
  return null;
}

/** Provedor efectivo: variável explícita ou primeira chave disponível. */
export function resolveAiProvider(): AiProviderId | null {
  const explicit = resolveProviderExplicit();
  if (explicit) {
    if (explicit === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
    if (explicit === "openai" && process.env.OPENAI_API_KEY) return "openai";
    return null;
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const REQUEST_MS = parsePositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 35_000);
const MAX_RESPONSE_CHARS = parsePositiveInt(process.env.AI_MAX_RESPONSE_CHARS, 10_000);

function sanitizeModelOutput(text: string): string {
  let t = text.trim();
  // Remove cercas de código comuns para entregar texto corrido à UI.
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "");
  if (t.length > MAX_RESPONSE_CHARS) {
    t = `${t.slice(0, MAX_RESPONSE_CHARS).trimEnd()}…`;
  }
  return t.trim();
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function completeAnthropic(system: string, user: string): Promise<CompleteChatResult> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.AI_ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      }),
    },
    REQUEST_MS,
  );
  const raw = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof raw.error === "object" && raw.error !== null && "message" in raw.error
        ? String((raw.error as { message?: string }).message)
        : res.statusText;
    throw new Error(`Anthropic ${res.status}: ${msg}`);
  }
  const content = raw.content;
  let text = "";
  if (Array.isArray(content)) {
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        (block as { type?: string }).type === "text" &&
        typeof (block as { text?: string }).text === "string"
      ) {
        text += (block as { text: string }).text;
      }
    }
  }
  const usage = raw.usage as { input_tokens?: number; output_tokens?: number } | undefined;
  const cleaned = sanitizeModelOutput(text);
  if (!cleaned) throw new Error("Resposta do modelo vazia.");
  return {
    text: cleaned,
    model,
    tokensIn: usage?.input_tokens,
    tokensOut: usage?.output_tokens,
  };
}

async function completeOpenAI(system: string, user: string): Promise<CompleteChatResult> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.AI_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
      }),
    },
    REQUEST_MS,
  );
  const raw = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof raw.error === "object" && raw.error !== null && "message" in raw.error
        ? String((raw.error as { message?: string }).message)
        : res.statusText;
    throw new Error(`OpenAI ${res.status}: ${msg}`);
  }
  const choices = raw.choices as Array<{ message?: { content?: string } }> | undefined;
  const text = choices?.[0]?.message?.content ?? "";
  const usage = raw.usage as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
      }
    | undefined;
  const cleaned = sanitizeModelOutput(text);
  if (!cleaned) throw new Error("Resposta do modelo vazia.");
  return {
    text: cleaned,
    model,
    tokensIn: usage?.prompt_tokens,
    tokensOut: usage?.completion_tokens,
  };
}

/**
 * Completa um turno chat (system + user). Usa Anthropic ou OpenAI conforme env.
 */
export async function completeChat(system: string, user: string): Promise<CompleteChatResult> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new Error(
      "LLM não configurado: defina ANTHROPIC_API_KEY ou OPENAI_API_KEY (e opcionalmente AI_PROVIDER).",
    );
  }
  if (provider === "anthropic") return completeAnthropic(system, user);
  return completeOpenAI(system, user);
}
