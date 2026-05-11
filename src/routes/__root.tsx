import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MetaPixel } from "@/components/MetaPixel";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "facebook-domain-verification",
        content: "ox2nr73dngykwqczy7k2yi2k675q1a",
      },
      { title: "AstroMap — Seu Mapa Astral Completo" },
      {
        name: "description",
        content:
          "Descubra seu mapa astral, interpretações dos planetas, casas e aspectos. Astrologia moderna em português.",
      },
      { property: "og:title", content: "AstroMap — Seu Mapa Astral Completo" },
      { name: "twitter:title", content: "AstroMap — Seu Mapa Astral Completo" },
      {
        name: "description",
        content:
          "A modern astrology platform for detailed birth charts, compatibility analysis, and planetary transit tracking.",
      },
      {
        property: "og:description",
        content:
          "A modern astrology platform for detailed birth charts, compatibility analysis, and planetary transit tracking.",
      },
      {
        name: "twitter:description",
        content:
          "A modern astrology platform for detailed birth charts, compatibility analysis, and planetary transit tracking.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce4c0761-7274-484b-9faf-89110fb77a8e/id-preview-6a518360--d4e8693b-554a-4129-b5e5-8110d5012555.lovable.app-1778457821294.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce4c0761-7274-484b-9faf-89110fb77a8e/id-preview-6a518360--d4e8693b-554a-4129-b5e5-8110d5012555.lovable.app-1778457821294.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: import.meta.env.VITE_SUPABASE_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-mystical">404</h1>
        <p className="mt-4 text-muted-foreground">Esta página não existe nas estrelas.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <Toaster />
          <MetaPixel />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
