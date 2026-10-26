import { useEffect, useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { SLUG_TO_TAB, TAB_SLUGS } from "@/lib/utils";
import { track } from "@/lib/analytics";

const ATTRIBUTION_KEY = "cdb:attribution";
const CONTENT_RE = /^[a-z0-9-]{1,80}$/;

/**
 * Internal short-link redirector.
 * URL: /s/<slug>[?c=<tag>]  →  registers landing_with_utm + redirects to /<slug>
 * Keeps shared links short and clean while preserving CTR/Conversion analytics.
 */
export default function ShareRedirect() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const rawContent = (params.get("c") ?? "").toLowerCase();
  const content = CONTENT_RE.test(rawContent) ? rawContent : null;

  const target = useMemo(() => {
    const tab = SLUG_TO_TAB[slug.toLowerCase()];
    if (!tab) return "/";
    // Preserva ?date=YYYY-MM-DD para o link abrir no dia certo (não em "Hoje").
    const date = params.get("date");
    const qs = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `?date=${date}` : "";
    return `/${TAB_SLUGS[tab]}${qs}`;
  }, [slug, params]);

  useEffect(() => {
    const tab = SLUG_TO_TAB[slug.toLowerCase()];
    if (!tab) {
      if (import.meta.env.DEV) console.warn(`[ShareRedirect] Unknown slug: "${slug}" — redirecting to /`);
      track("landing_with_unknown_slug", {
        slug,
        referrer: document.referrer || null,
        captured_at: new Date().toISOString(),
      });
      return;
    }
    const tabSlug = TAB_SLUGS[tab];
    const utms = {
      utm_source: "whatsapp",
      utm_medium: "status",
      utm_campaign: `share-${tabSlug}`,
      utm_content: content,
    };
    const payload = {
      ...utms,
      tab,
      tab_slug: tabSlug,
      referrer: document.referrer || null,
      landing_path: `/${tabSlug}`,
      captured_at: new Date().toISOString(),
      via: "short-link",
    };
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(payload)); } catch { /* noop */ }
    track("landing_with_utm", payload);
  }, [slug, content]);

  return <Navigate to={target} replace />;
}
