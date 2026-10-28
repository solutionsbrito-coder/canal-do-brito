/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

// Force immediate activation
clientsClaim();
self.skipWaiting();

// Workbox precache (injected by vite-plugin-pwa) — filtered to skip index.html
// We never want index.html cached as a precached asset; it must always come from network
// so users pick up new asset hashes immediately after a deploy.
const manifest = self.__WB_MANIFEST.filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return !url.endsWith("index.html") && !url.endsWith("version.json");
});
precacheAndRoute(manifest);

// version.json must NEVER be cached — it's the cache-busting beacon.
registerRoute(({ url }) => url.pathname === "/version.json", new NetworkOnly());

// SPA navigation: NetworkFirst with 3s timeout → falls back to cached shell only if offline.
// This guarantees the freshest index.html (and therefore freshest asset hashes) on every navigation.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "html-shell",
      networkTimeoutSeconds: 3,
      plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 })],
    })
  )
);

// Runtime caching: Google Fonts
registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Runtime caching: TMDB images
registerRoute(
  ({ url }) => url.origin === "https://image.tmdb.org",
  new CacheFirst({
    cacheName: "tmdb-images",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// ── Push Notifications ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; tag?: string; url?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: "Canal do Brito", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    // C2 — presença: vibração mais longa e a notificação fica parada
    // até o visitante dispensar (no desktop, é esse o objetivo).
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    tag: data.tag || "game-reminder",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [{ action: "open", title: "Abrir" }],
  } as NotificationOptions & { vibrate: number[]; renotify: boolean; requireInteraction: boolean; actions: Array<{ action: string; title: string }> };

  event.waitUntil(
    self.registration.showNotification(data.title || "Canal do Brito", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

// ── B2 — rotação de endpoint ─────────────────────────────────────
// Quando o navegador rotaciona a inscrição push sozinho, o endpoint
// antigo morre e o novo ainda não existe no banco: o sino passaria a
// sincronizar um endpoint desconhecido e os lembretes do endpoint
// antigo ficariam órfãos. Este handler registra o endpoint novo no
// banco (mesmo RPC do sync do app, upsert_push_subscription) assim
// que a rotação acontece, sem esperar o usuário reabrir o app.
//
// Limites honestos:
// - É best-effort e silencioso: sem UI no SW, falha não mostra nada;
//   o sync do mount do app (usePushSubscription) continua sendo o
//   fallback quando o usuário reabrir o app.
// - NÃO transfere game_ids do endpoint antigo (isso é o B1): a linha
//   antiga é preservada de propósito, para o B1 usá-la como origem.
//   Até o B1, lembretes do endpoint antigo continuam perdidos após
//   a rotação — o que o B2 garante é que o endpoint novo passa a
//   existir e os próximos sinos funcionam.
// - O evento pushsubscriptionchange é pouco confiável entre
//   navegadores (o Chrome nem sempre o dispara); por isso ele é um
//   complemento, não o mecanismo principal.
function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function upsertPushSubscriptionFromSw(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return;
  const resp = await fetch(`${url}/rest/v1/rpc/upsert_push_subscription`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ _endpoint: endpoint, _p256dh: p256dh, _auth: auth }),
  });
  if (!resp.ok) {
    throw new Error(`upsert_push_subscription failed: ${resp.status}`);
  }
}

async function handlePushSubscriptionChange(event: Event): Promise<void> {
  try {
    const ev = event as Event & {
      newSubscription?: PushSubscription | null;
    };
    let sub = ev.newSubscription ?? null;
    if (!sub) {
      sub = await self.registration.pushManager.getSubscription();
    }
    if (!sub) {
      // Sem inscrição atual: reinscrever com a chave VAPID pública
      // (legível por anônimo em settings, igual ao app).
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!url || !key) return;
      const settingsResp = await fetch(
        `${url}/rest/v1/settings?key=eq.vapid_public_key&select=value`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      if (!settingsResp.ok) return;
      const rows = (await settingsResp.json()) as Array<{ value?: string }>;
      const vapidKey = rows[0]?.value;
      if (!vapidKey) return;
      sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
    }
    const keys = sub.toJSON().keys as { p256dh?: string; auth?: string } | undefined;
    if (!keys?.p256dh || !keys?.auth) return;
    await upsertPushSubscriptionFromSw(sub.endpoint, keys.p256dh, keys.auth);
  } catch {
    // Best-effort: o sync do mount do app tenta de novo na próxima
    // abertura. Nada aqui pode quebrar o SW.
  }
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(handlePushSubscriptionChange(event));
});

// ── Clean stale caches on activate ──────────────────────────────────
self.addEventListener("activate", (event) => {
  const KEEP = new Set(["google-fonts", "tmdb-images", "html-shell"]);
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !KEEP.has(name))
          .filter((name) => !name.startsWith("workbox-precache"))
          .map((name) => caches.delete(name))
      )
    )
  );
});
