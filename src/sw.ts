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
    vibrate: [200, 100, 200],
    tag: data.tag || "game-reminder",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [{ action: "open", title: "Abrir" }],
  } as NotificationOptions & { vibrate: number[]; renotify: boolean; actions: Array<{ action: string; title: string }> };

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
