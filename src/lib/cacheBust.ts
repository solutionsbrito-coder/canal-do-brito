/**
 * Append a cache-busting query param (?v=...) to a URL based on a stamp
 * (typically an ISO timestamp from the backend or a build-time version).
 *
 * - Falsy URLs are returned untouched.
 * - blob:/data: URLs are returned untouched (already unique per instance).
 * - Falsy stamps result in the original URL (no busting noise when unknown).
 */
export function withCacheBust(
  url: string | null | undefined,
  stamp: string | number | null | undefined
): string | null | undefined {
  if (!url) return url;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (stamp === null || stamp === undefined || stamp === "") return url;

  let token: string;
  if (typeof stamp === "number") {
    token = Number.isFinite(stamp) ? Math.floor(stamp).toString(36) : String(stamp);
  } else {
    const parsed = Date.parse(stamp);
    token = Number.isNaN(parsed) ? String(stamp).slice(0, 16) : parsed.toString(36);
  }

  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${token}`;
}
