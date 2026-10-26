import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Build a deep-link URL for a specific public tab/section.
 * Used for sharing on WhatsApp Status so the recipient lands directly
 * on the right view (programação ou filmes e séries).
 */
export type PublicTab = "schedule" | "novidades";

/** Pretty path slugs used in shared URLs (WhatsApp Status, etc.). */
export const TAB_SLUGS: Record<PublicTab, string> = {
  schedule: "programacao",
  novidades: "filmes-e-series",
};

/** Reverse lookup: slug → tab id. Includes legacy aliases. */
export const SLUG_TO_TAB: Record<string, PublicTab> = {
  // Programação (default)
  "programacao": "schedule",
  "schedule": "schedule",
  "agenda": "schedule",        // legacy /agenda
  "ao-vivo": "schedule",       // legacy /ao-vivo
  "live": "schedule",          // legacy
  "home": "schedule",          // legacy
  // Filmes e Séries
  "filmes-e-series": "novidades",
  "filmes": "novidades",
  "series": "novidades",
  "novidades": "novidades",
  "sugestoes": "novidades",    // legacy
  "destaques": "novidades",    // legacy
  "highlights": "novidades",   // legacy
};

export interface DeepLinkOptions {
  /** When true, append UTM params for analytics tracking */
  utm?: boolean;
  /** When true, return a clean short link via /s/<slug> (preferred for sharing). */
  short?: boolean;
  source?: string;   // utm_source — default: "whatsapp"
  medium?: string;   // utm_medium — default: "status"
  campaign?: string; // utm_campaign — default: "share-<slug>"
  content?: string;  // utm_content — identifies the specific card/CTA clicked
}

/** Slugify free text for use as utm_content (lowercase, hyphenated, ASCII). */
export function slugifyUtm(text: string): string {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildDeepLink(base: string, tab?: PublicTab, opts: DeepLinkOptions = {}): string {
  const cleanBase = base.replace(/\/$/, "");
  // Default to "schedule" when no tab is specified (programação é a home agora).
  const effectiveTab: PublicTab = tab ?? "schedule";

  // Preferred sharing format: /s/<slug>
  if (opts.short) {
    const slug = TAB_SLUGS[effectiveTab];
    const path = `${cleanBase}/s/${slug}`;
    if (opts.content) {
      const tabPrefix = `${slug}-`;
      const c = slugifyUtm(opts.content);
      const tagged = c.startsWith(tabPrefix) || /^(ab|tpl|quick|custom|whatsapp)-/.test(c)
        ? c : `${tabPrefix}${c}`;
      return `${path}?c=${tagged}`;
    }
    return path;
  }

  const path = `${cleanBase}/${TAB_SLUGS[effectiveTab]}`;
  if (!opts.utm && !opts.content) return path;

  const params = new URLSearchParams({
    utm_source: opts.source ?? "whatsapp",
    utm_medium: opts.medium ?? "status",
    utm_campaign: opts.campaign ?? `share-${TAB_SLUGS[effectiveTab]}`,
  });
  if (opts.content) {
    const tabPrefix = `${TAB_SLUGS[effectiveTab]}-`;
    const slug = slugifyUtm(opts.content);
    params.set("utm_content", slug.startsWith(tabPrefix) ? slug : `${tabPrefix}${slug}`);
  }
  return `${path}?${params.toString()}`;
}
