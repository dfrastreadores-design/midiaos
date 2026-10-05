// Service Worker — Mídia.OS PWA
const CACHE_NAME = "midiaos-cache-v4";
const STATIC_ASSETS = [
  "/favicon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }),
  );
  self.clients.claim();
});

// Network-first strategy for data & navigation; cache-first fallback for static assets
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Não interceptar requisições para Supabase API ou terceiros
  if (url.origin !== self.location.origin) return;

  // Páginas HTML e chamadas de API: sempre tentar rede primeiro para garantir dados de produção atualizados
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match("/"));
      }),
    );
    return;
  }

  // Arquivos estáticos (imagens, ícones, fontes): tentar cache primeiro, depois rede
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Padrão: rede com fallback para cache seguro (sem lançar TypeError caso cache.match retorne undefined)
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response("Offline ou recurso indisponível", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }),
  );
});

// ============================================================================
// 🔔 SISTEMA DE PUSH NOTIFICATIONS (DESKTOP & MOBILE / ANDROID & IOS)
// ============================================================================

// Listener de eventos Push do Servidor (Web Push Protocol)
self.addEventListener("push", (event) => {
  let payload = {
    title: "Mídia.OS",
    body: "Você possui uma nova notificação no Mídia.OS.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: { url: "/" },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const title = payload.title || "Mídia.OS";
  const options = {
    body: payload.body,
    icon: payload.icon || "/favicon.png",
    badge: payload.badge || "/favicon.png",
    vibrate: [150, 75, 150],
    data: payload.data || { url: "/" },
    tag: payload.tag || "midiaos-notificacao",
    renotify: true,
    requireInteraction: false,
    actions: payload.actions || [
      { action: "open", title: "Abrir no Mídia.OS" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener de Mensagens Internas enviadas pela aplicação React
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_LOCAL_PUSH") {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || "",
      icon: options?.icon || "/favicon.png",
      badge: options?.badge || "/favicon.png",
      vibrate: [150, 75, 150],
      data: options?.data || { url: "/" },
      tag: options?.tag || `midiaos-local-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
    };
    event.waitUntil(self.registration.showNotification(title || "Mídia.OS", notificationOptions));
  }
});

// Listener de Clique na Notificação Push (Desktop & Mobile)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma aba ou janela aberta, dá foco nela e redireciona
        for (const client of clientList) {
          if (client.url && client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl && targetUrl !== "/") {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Se não houver janela aberta do Mídia.OS, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

