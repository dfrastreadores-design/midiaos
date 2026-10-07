import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSpotlightCommand } from "@/components/GlobalSpotlightCommand";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe, foi movida ou sua URL foi alterada.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao Início
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Acessar Sistema
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Erro capturado no Root Error Boundary:", error);
  const router = useRouter();

  if (typeof window !== "undefined") {
    try {
      fetch("/client_log.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message,
          stack: error?.stack,
          url: window.location.href,
        }),
      }).catch(() => {});
    } catch {}
  }

  // Stale chunk or initialization error after a new deploy — auto-reload once to fetch the new bundle.
  if (
    typeof window !== "undefined" &&
    /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|before initialization/i.test(
      String(error?.message ?? ""),
    )
  ) {
    const KEY = "midiaos:chunk-reload";
    if (sessionStorage.getItem(KEY) !== "1") {
      sessionStorage.setItem(KEY, "1");
      if ("caches" in window) {
        window.caches.keys().then((names) => {
          names.forEach((name) => window.caches.delete(name));
        }).finally(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
      return null;
    }
  }

  const isForbidden =
    /forbidden|acesso negado|permissão|403/i.test(String(error?.message ?? ""));

  const isAuthError =
    !isForbidden &&
    /unauthorized|não autorizado|jwt|auth|sessão expirada/i.test(String(error?.message ?? ""));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center p-6 rounded-2xl border bg-card shadow-sm">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {isForbidden
            ? "Acesso Negado"
            : isAuthError
            ? "Sessão Expirada ou Não Autorizada"
            : "Esta página encontrou uma instabilidade"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isForbidden
            ? "Você não tem permissão para acessar este recurso no Mídia.OS. Solicite autorização ao administrador."
            : isAuthError
            ? "Sua sessão de acesso expirou. Faça login novamente para continuar utilizando o Mídia.OS."
            : "Ocorreu um erro inesperado ao carregar os dados desta tela. Você pode tentar recarregar ou retornar ao início."}
        </p>

        {error?.message && !isAuthError && (
          <details open className="mt-4 text-left p-3 rounded-lg bg-muted text-xs font-mono text-muted-foreground overflow-auto max-h-48 select-text">
            <summary className="cursor-pointer font-semibold mb-1 text-foreground">
              Detalhes técnicos do erro
            </summary>
            <div className="font-bold text-destructive mb-1">{error.message}</div>
            {error.stack && (
              <pre className="mt-1 whitespace-pre-wrap text-[10px] leading-tight text-foreground/80">{error.stack}</pre>
            )}
          </details>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao Início
          </a>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) => {
                    regs.forEach((r) => r.unregister());
                  });
                }
                if ("caches" in window) {
                  window.caches.keys().then((names) => {
                    names.forEach((n) => window.caches.delete(n));
                  });
                }
                sessionStorage.clear();
                localStorage.removeItem("midiaos:chunk-reload");
                window.location.href = "/";
              }
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Limpar Cache & Recarregar
          </button>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Fazer Login
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover",
      },
      { name: "format-detection", content: "telephone=no" },
      { name: "apple-touch-fullscreen", content: "yes" },
      { title: "NEXO Mídia e Representação | Hub de Negócios & Soluções Estratégicas em Mídia" },
      {
        name: "description",
        content:
          "NEXO Mídia e Representação — Hub de Negócios & Soluções Estratégicas em Mídia. Inteligência comercial, planejamento 360°, inventário de mídia exterior, indoor e soluções in-house no DF e entorno.",
      },
      {
        name: "keywords",
        content:
          "Nexo Mídia e Representação, Hub de Negócios, mídia DF, DOOH Brasília, OOH, mídia exterior, inteligência comercial, Mídia.OS",
      },
      { name: "author", content: "NEXO Mídia e Representação" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "NEXO Mídia e Representação" },
      {
        property: "og:title",
        content: "NEXO Mídia e Representação | Hub de Negócios & Soluções Estratégicas em Mídia",
      },
      {
        property: "og:description",
        content:
          "Hub de Negócios & Soluções Estratégicas em Mídia. Mídia.OS • Plataforma Oficial de Inteligência Comercial.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      {
        property: "og:image",
        content: "https://nexomidiaerepresentacao.com.br/logo-nexo.png",
      },
      {
        property: "og:image:alt",
        content: "NEXO Mídia e Representação — Hub de Negócios & Soluções Estratégicas em Mídia",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "NEXO Mídia e Representação | Hub de Negócios & Soluções Estratégicas em Mídia",
      },
      {
        name: "twitter:description",
        content: "Hub de Negócios & Soluções Estratégicas em Mídia. Mídia.OS • Plataforma Oficial de Inteligência Comercial.",
      },
      { name: "theme-color", content: "#0f172a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "NEXO Mídia e Representação" },
      { name: "application-name", content: "NEXO Mídia e Representação" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "NEXO Mídia e Representação",
          url: "https://nexomidiaerepresentacao.com.br",
          logo: "https://nexomidiaerepresentacao.com.br/logo-nexo.png",
          description:
            "Hub de Negócios & Soluções Estratégicas em Mídia. Inteligência geográfica, veículos consolidados e soluções 360° no Distrito Federal e entorno.",
          sameAs: ["https://nexomidiaerepresentacao.com.br"],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "NEXO Mídia e Representação",
          url: "https://nexomidiaerepresentacao.com.br",
          inLanguage: "pt-BR",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
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

  if (typeof window !== "undefined") {
    // One-time install of a global handler for stale chunks after redeploys.
    // Covers dynamic import() calls in feature code (e.g. gerarPdfPi) that
    // are caught locally and never reach the router errorComponent.
    const w = window as unknown as { __midiaosChunkReloadInstalled?: boolean };
    if (!w.__midiaosChunkReloadInstalled) {
      w.__midiaosChunkReloadInstalled = true;
      const KEY = "midiaos:chunk-reload";
      const isChunkErr = (msg: string) =>
        /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically imported module/i.test(
          msg,
        );
      const tryReload = () => {
        if (sessionStorage.getItem(KEY) !== "1") {
          sessionStorage.setItem(KEY, "1");
          window.location.reload();
        }
      };
      window.addEventListener("vite:preloadError", (e) => {
        e.preventDefault();
        tryReload();
      });
      window.addEventListener("error", (e) => {
        if (isChunkErr(String(e?.message ?? ""))) tryReload();
      });
      window.addEventListener("unhandledrejection", (e) => {
        const msg = String((e?.reason as Error)?.message ?? e?.reason ?? "");
        if (isChunkErr(msg)) tryReload();
      });

      // Registra o Service Worker para suporte a PWA (instalação no celular, tablet e computador)
      if (
        ("serviceWorker" in navigator && window.location.protocol === "https:") ||
        window.location.hostname === "localhost"
      ) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Mídia.OS PWA Service Worker registrado:", reg.scope);
          })
          .catch((err) => {
            console.warn("Falha ao registrar Service Worker PWA:", err);
          });
      }
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <GlobalSpotlightCommand />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
