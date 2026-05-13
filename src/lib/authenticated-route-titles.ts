/** Título contextual para o cabeçalho da área autenticada (TanStack Router pathnames). */
export function titleForAuthenticatedPath(pathname: string): string {
  if (pathname === "/dashboard") return "Início";
  if (pathname.startsWith("/onboarding")) return "Boas-vindas";
  if (pathname === "/planos") return "Planos";
  if (pathname === "/assinatura") return "Assinatura";
  if (pathname === "/premium") return "Redirecionamento";
  if (pathname.startsWith("/mapas/novo")) return "Novo mapa";
  if (/^\/mapas\/[^/]+$/.test(pathname)) return "Mapa natal";
  if (pathname.startsWith("/mapas")) return "Meus mapas";
  if (pathname.startsWith("/compatibilidade")) return "Compatibilidade";
  if (pathname.startsWith("/transitos")) return "Trânsitos";
  if (pathname.startsWith("/admin")) return "Administração";
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  return "AstroMap";
}
