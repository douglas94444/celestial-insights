/**
 * Caminho interno seguro após login (query `redirect` em `/auth`).
 * Evita open redirect para URLs externas ou protocolos relativos.
 *
 * Para `/assinatura`, permite o query exato `?produto=mapa` (checkout do mapa avulso).
 * Outros query strings em `/assinatura` são ignorados e devolve só `/assinatura`.
 * Para os restantes caminhos permitidos, devolve só o pathname (ignora query).
 */
const ALLOWED_PATHNAME =
  /^\/(assinatura|premium|planos|dashboard|onboarding|configuracoes|transitos|momento|compatibilidade|admin)(\/|$)/;

const MAPAS_PATH = /^\/mapas(\/|$)/;

function isAllowedInternalPath(pathOnly: string): boolean {
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) return false;
  if (pathOnly.includes("..") || pathOnly.includes("\\")) return false;
  if (pathOnly === "/auth" || pathOnly === "/") return false;
  if (ALLOWED_PATHNAME.test(pathOnly)) return true;
  if (MAPAS_PATH.test(pathOnly)) return true;
  return false;
}

function normalizePath(pathOnly: string): string {
  if (pathOnly === "/assinatura/") return "/assinatura";
  return pathOnly;
}

/** Apenas `?produto=mapa` (sem outros parâmetros). */
function assinaturaQueryOnlyMapa(queryWithoutQuestion: string): boolean {
  const params = new URLSearchParams(queryWithoutQuestion);
  const keys = [...params.keys()];
  if (keys.length !== 1 || keys[0] !== "produto") return false;
  return params.get("produto") === "mapa";
}

export function sanitizePostAuthRedirectPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  const qIndex = trimmed.indexOf("?");
  const pathOnlyRaw = (qIndex === -1 ? trimmed : trimmed.slice(0, qIndex)).split("#")[0] ?? "";
  const pathOnly = normalizePath(pathOnlyRaw);
  if (!isAllowedInternalPath(pathOnlyRaw)) return undefined;

  if (qIndex === -1) return pathOnly;

  const queryPart = trimmed.slice(qIndex + 1).split("#")[0] ?? "";

  if (pathOnly === "/assinatura") {
    if (queryPart === "") return "/assinatura";
    if (assinaturaQueryOnlyMapa(queryPart)) return "/assinatura?produto=mapa";
    return "/assinatura";
  }

  return pathOnly;
}
