/**
 * Pathname interno seguro após login (query `redirect` em `/auth`).
 * Evita open redirect para URLs externas ou protocolos relativos.
 */
export function sanitizePostAuthRedirectPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const pathOnly = raw.trim().split("?")[0]?.split("#")[0] ?? "";
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) return undefined;
  if (pathOnly.includes("..") || pathOnly.includes("\\")) return undefined;
  if (pathOnly === "/auth" || pathOnly === "/") return undefined;
  if (
    /^\/(premium|dashboard|onboarding|configuracoes|transitos|momento|compatibilidade|admin)(\/|$)/.test(
      pathOnly,
    )
  ) {
    return pathOnly;
  }
  if (/^\/mapas(\/|$)/.test(pathOnly)) return pathOnly;
  return undefined;
}
