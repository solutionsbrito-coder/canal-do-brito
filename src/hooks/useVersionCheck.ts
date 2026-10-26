import { useEffect, useState } from "react";

declare const __APP_VERSION__: string;

const VERSION_URL = "/version.json";
const POLL_INTERVAL = 2 * 60 * 1000; // 2 min
const STORAGE_KEY = "cdb:lastSeenVersion";

/**
 * Polls /version.json and detects when a new build was deployed.
 * On detection: clears caches, unregisters service worker, and reloads.
 *
 * Strategy:
 * - Compare the build-time stamp embedded in the bundle (__APP_VERSION__)
 *   with the freshly-fetched version.json (cache-busted with ?t=).
 * - When they differ → new deploy is live → hard reload.
 */
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const currentVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
    if (currentVersion === "dev") return; // skip in dev

    let stopped = false;

    const check = async () => {
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version: string };
        if (version && version !== currentVersion) {
          if (stopped) return;
          try { localStorage.setItem(STORAGE_KEY, version); } catch { /* noop */ }
          setUpdateAvailable(true);
        }
      } catch { /* network blip — try again next tick */ }
    };

    // Initial check after page settles
    const initial = window.setTimeout(check, 8000);
    const interval = window.setInterval(check, POLL_INTERVAL);

    // Re-check whenever the tab comes back to foreground
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /** Hard reload: nuke caches, unregister SW, reload bypassing browser cache. */
  const applyUpdate = async () => {
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch { /* ignore */ }
    // Force network fetch of index.html
    window.location.replace(window.location.pathname + window.location.search + `#v=${Date.now()}`);
    window.location.reload();
  };

  return { updateAvailable, applyUpdate };
}
