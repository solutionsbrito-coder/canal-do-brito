/**
 * Lightweight UTM-aware analytics tracker.
 * - Captures utm_* params from the URL on load and persists them (sessionStorage).
 * - Emits a `analytics:track` CustomEvent on window for in-app listeners.
 * - Forwards to gtag / plausible / posthog / dataLayer if present (no hard dep).
 */

import { SLUG_TO_TAB, TAB_SLUGS, type PublicTab } from "@/lib/utils";

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const ATTRIBUTION_KEY = "cb:last_attribution";
const ANON_ID_KEY = "cb:anon_id";
const SESSION_ID_KEY = "cb:session_id";

/** Get-or-create a persistent anonymous visitor id (localStorage, UUID v4). */
export function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return "anon-unavailable";
  }
}

/** Per-tab session id — resets when the tab closes. */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "sess-unavailable";
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
  }
}

export function readUtmsFromUrl(search = window.location.search): UtmParams {
  const p = new URLSearchParams(search);
  const out: UtmParams = {};
  (["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const).forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}

const EVENTS_LOG_KEY = "cb:events_log";
const EVENTS_LOG_MAX = 500;

export interface LoggedEvent {
  ts: number;
  event: string;
  props: Record<string, unknown>;
}

function appendToEventsLog(entry: LoggedEvent): void {
  try {
    const raw = localStorage.getItem(EVENTS_LOG_KEY);
    const arr: LoggedEvent[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    if (arr.length > EVENTS_LOG_MAX) arr.splice(0, arr.length - EVENTS_LOG_MAX);
    localStorage.setItem(EVENTS_LOG_KEY, JSON.stringify(arr));
  } catch { /* noop */ }
}

export function readEventsLog(): LoggedEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearEventsLog(): void {
  try { localStorage.removeItem(EVENTS_LOG_KEY); } catch { /* noop */ }
}

/** Best-effort persistence to Supabase analytics_events table (fire-and-forget). */
async function persistToSupabase(event: string, enriched: Record<string, unknown>): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase.from("analytics_events") as unknown as { insert: (row: Record<string, unknown>) => Promise<unknown> }).insert({
      event,
      user_id: String(enriched.user_id ?? ""),
      session_id: String(enriched.session_id ?? ""),
      utm_source: (enriched.utm_source as string) ?? null,
      utm_medium: (enriched.utm_medium as string) ?? null,
      utm_campaign: (enriched.utm_campaign as string) ?? null,
      utm_content: (enriched.utm_content as string) ?? null,
      utm_term: (enriched.utm_term as string) ?? null,
      tab: (enriched.tab as string) ?? (enriched.landing_tab as string) ?? null,
      surface: (enriched.surface as string) ?? null,
      props: enriched,
    });
  } catch { /* noop — never block UX on analytics */ }
}

/** Best-effort dispatch to whichever analytics provider is present. */
export function track(eventName: string, props: Record<string, unknown> = {}): void {
  const enriched = {
    user_id: getAnonymousId(),
    session_id: getSessionId(),
    ...props,
  };

  appendToEventsLog({ ts: Date.now(), event: eventName, props: enriched });
  void persistToSupabase(eventName, enriched);

  try {
    window.dispatchEvent(new CustomEvent("analytics:track", { detail: { event: eventName, props: enriched } }));
  } catch { /* noop */ }

  try { window.gtag?.("event", eventName, enriched); } catch { /* noop */ }
  try { window.dataLayer?.push({ event: eventName, ...enriched }); } catch { /* noop */ }
  try { window.plausible?.(eventName, { props: enriched }); } catch { /* noop */ }
  try { window.posthog?.capture(eventName, enriched); } catch { /* noop */ }

  if (import.meta.env.DEV) {
     
    console.debug("[analytics]", eventName, enriched);
  }
}

/**
 * Resolve which public tab the URL is targeting, combining:
 * - pathname slug (e.g. /ao-vivo)
 * - legacy ?tab= param
 * - utm_campaign convention `share-<slug>`
 */
export function resolveTabFromUrl(): PublicTab | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (path && SLUG_TO_TAB[path]) return SLUG_TO_TAB[path];

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("tab")?.toLowerCase();
  if (fromQuery && SLUG_TO_TAB[fromQuery]) return SLUG_TO_TAB[fromQuery];

  const campaign = params.get("utm_campaign")?.toLowerCase() ?? "";
  const m = campaign.match(/^share-([a-z-]+)$/);
  if (m && SLUG_TO_TAB[m[1]]) return SLUG_TO_TAB[m[1]];

  return null;
}

/**
 * Capture UTMs once on app load and emit a `landing_with_utm` event
 * correlating utm_campaign with the actually-rendered tab.
 * Returns the captured UTMs (or null when none were present).
 */
export function captureLandingAttribution(activeTab: PublicTab | null): UtmParams | null {
  const utms = readUtmsFromUrl();
  const hasAny = Object.keys(utms).length > 0;
  if (!hasAny) return null;

  const payload = {
    ...utms,
    tab: activeTab,
    tab_slug: activeTab ? TAB_SLUGS[activeTab] : null,
    referrer: document.referrer || null,
    landing_path: window.location.pathname,
    captured_at: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(payload));
  } catch { /* noop */ }

  track("landing_with_utm", payload);
  return utms;
}

export function getStoredAttribution(): (UtmParams & { tab?: PublicTab | null }) | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export interface ContentClickProps {
  /** Section/component the card lives in (e.g. "weekly-movies", "novidades"). */
  surface: string;
  /** Content kind: movie, series, news, game, banner, etc. */
  content_type: string;
  /** Stable id of the content (db id, tmdb id, slug...). */
  content_id?: string | number | null;
  /** Human-readable title for debugging. */
  content_title?: string | null;
  /** Position in the row/list (0-indexed). */
  position?: number | null;
  /** Action — "open" (default), "trailer", "external". */
  action?: "open" | "trailer" | "external";
}

/**
 * Fire a `content_card_click` event ONLY when the current session arrived via
 * a UTM link. Correlates the click back to the originating utm_campaign /
 * utm_content so we can see which shared link drove which card open.
 */
export function trackContentClick(props: ContentClickProps): void {
  const attribution = getStoredAttribution();
  if (!attribution?.utm_campaign && !attribution?.utm_source) return;

  track("content_card_click", {
    ...props,
    action: props.action ?? "open",
    utm_source: attribution.utm_source ?? null,
    utm_medium: attribution.utm_medium ?? null,
    utm_campaign: attribution.utm_campaign ?? null,
    utm_content: attribution.utm_content ?? null,
    landing_tab: attribution.tab ?? null,
    from_share: attribution.utm_campaign?.startsWith("share-") ?? false,
  });
}

export interface ShareProps {
  /** Where in the admin the share happened. */
  surface: "admin-whatsapp-quick" | "admin-whatsapp-day" | "admin-whatsapp-template" | "admin-whatsapp-custom" | "admin-whatsapp-ab" | "admin-whatsapp-format";
  /** Tab targeted by the shared link, if any. */
  tab?: PublicTab | null;
  /** utm_campaign that was embedded in the shared link, if any. */
  utm_campaign?: string | null;
  /** utm_content that was embedded in the shared link, if any. */
  utm_content?: string | null;
  /** "copy" (clipboard) or "open" (wa.me opened). */
  action: "copy" | "open";
  /** Message format id (completa, curta, ao-vivo, proximos, filmes-series). */
  format?: string | null;
  /** Schedule date the message refers to (YYYY-MM-DD). */
  date?: string | null;
  /** Number of games/titles included in the message. */
  game_count?: number | null;
  /** Message text (truncated) so the admin can copy/resend from history. Never contains phone numbers. */
  message?: string | null;
  /** true when the admin edited the default text before sharing. */
  edited?: boolean | null;
}

/**
 * Track when an admin copies or opens a WhatsApp link.
 * These events become the "shares" denominator of the click-through funnel:
 *   shares  → landing_with_utm  → tab_view (CTR & conversion).
 */
export function trackShare(props: ShareProps): void {
  track("link_share", {
    ...props,
    tab_slug: props.tab ? TAB_SLUGS[props.tab] : null,
  });
}
