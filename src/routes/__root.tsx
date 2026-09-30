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

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  // Stale chunk after a new deploy — auto-reload once to fetch the new bundle.
  if (
    typeof window !== "undefined" &&
    /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
      String(error?.message ?? ""),
    )
  ) {
    const KEY = "midiaos:chunk-reload";
    if (sessionStorage.getItem(KEY) !== "1") {
      sessionStorage.setItem(KEY, "1");
      window.location.reload();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "mídia.OS — Sistema comercial para veículos de comunicação" },
      {
        name: "description",
        content:
          "Aumente suas vendas de mídia: CRM, propostas, PI digital e financeiro em uma plataforma feita para TVs, rádios, portais e OOH/DOOH. Agende uma demonstração gratuita.",
      },
      {
        name: "keywords",
        content:
          "sistema para emissora de tv, software para rádio, CRM mídia, PI digital, propostas comerciais, gestão de mídia, software para veículos de comunicação",
      },
      { name: "author", content: "mídia.OS" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "mídia.OS" },
      {
        property: "og:title",
        content: "mídia.OS — Sistema comercial para veículos de comunicação",
      },
      {
        property: "og:description",
        content:
          "Do briefing à PI assinada: tudo em uma plataforma feita para quem vende mídia. Demonstração gratuita.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9bdbc7cd-7703-4e9b-8dec-61e20fa07162",
      },
      {
        property: "og:image:alt",
        content: "mídia.OS — sistema comercial para veículos de comunicação",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "mídia.OS — Sistema comercial para veículos de comunicação",
      },
      {
        name: "twitter:description",
        content: "Do briefing à PI assinada: tudo em uma plataforma feita para quem vende mídia.",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9bdbc7cd-7703-4e9b-8dec-61e20fa07162",
      },
      { name: "theme-color", content: "#0d0d24" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Mídia.OS" },
      { name: "application-name", content: "Mídia.OS" },
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
          name: "mídia.OS",
          url: "https://midiaos.online",
          logo: "https://midiaos.online/favicon.png",
          description:
            "Plataforma SaaS de gestão comercial para veículos de comunicação: emissoras de TV, rádios, portais e mídia OOH/DOOH.",
          sameAs: [],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "mídia.OS",
          url: "https://midiaos.online",
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
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
