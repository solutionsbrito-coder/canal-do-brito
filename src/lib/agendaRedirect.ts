import { SLUG_TO_TAB, TAB_SLUGS } from "./utils";

/**
 * Allowlist of query params preserved when redirecting legacy /agenda → /programacao.
 * Anything outside this list is dropped to avoid leaking stale params.
 */
const PRESERVED_KEYS = new Set<string>([
  "date",
  "tab",
  "ref",
  "src",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

/** Validate `YYYY-MM-DD` and confirm it's a real calendar date. */
export function isValidDateParam(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Build the target URL for redirecting `/agenda` to `/programacao`,
 * validating `date`, normalizing `tab`, preserving UTMs/known params,
 * and dropping anything else. Hash is preserved as-is.
 */
export function buildProgramacaoRedirect(search: string, hash = ""): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out = new URLSearchParams();

  for (const key of PRESERVED_KEYS) {
    const value = params.get(key);
    if (value === null || value === "") continue;

    if (key === "date") {
      if (isValidDateParam(value)) out.set("date", value);
      continue;
    }

    if (key === "tab") {
      const mapped = SLUG_TO_TAB[value.toLowerCase()];
      if (mapped) out.set("tab", TAB_SLUGS[mapped]);
      continue;
    }

    out.set(key, value);
  }

  const qs = out.toString();
  const safeHash = hash && !hash.startsWith("#") ? `#${hash}` : hash;
  return `/programacao${qs ? `?${qs}` : ""}${safeHash || ""}`;
}
