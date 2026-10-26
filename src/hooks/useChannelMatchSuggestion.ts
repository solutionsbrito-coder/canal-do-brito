import { useMemo } from "react";
import { normalizeChannelName, type LogoKey } from "@/components/public/channelLogos";
import { BUILTIN_CHANNEL_MAP } from "@/components/public/ChannelBadge";
import type { ChannelMapping } from "./useChannelMappings";
import type { DiscoveredChannel } from "./useDiscoveredChannels";

export type SuggestionConfidence = "high" | "medium" | "low";

export type SuggestionTarget =
  | { kind: "mapping"; mapping: ChannelMapping; displayName: string; normalized: string }
  | { kind: "builtin"; builtinName: string; logoKey: LogoKey; displayName: string; normalized: string };

export type ChannelMatchSuggestion = {
  target: SuggestionTarget;
  confidence: SuggestionConfidence;
  reason: string;
};

const VARIANT_SUFFIXES = [
  // qualidade
  "hd", "sd", "fhd", "uhd", "4k", "8k",
  // numéricos
  "2", "3", "4", "5", "6", "7", "8", "9",
  // tier
  "plus", "premium", "gold", "extra", "alt", "alternativo", "alternativa",
  // estados BR
  "sp", "rj", "mg", "rs", "pr", "sc", "ba", "pe", "ce", "df", "go", "es", "pa", "am",
  // país / idioma
  "br", "brasil", "brazil", "pt", "ptbr", "br2", "brasil2",
  // streaming/online
  "online", "live", "ao-vivo", "aovivo", "stream", "web",
  // canais sport extras
  "sports", "sport", "news", "max",
];

/** Levenshtein simples (capped). */
function distance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let row = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      row = Math.min(row, dp[i][j]);
    }
    if (row > max) return max + 1;
  }
  return dp[a.length][b.length];
}

function isVariantSuffix(rest: string): boolean {
  if (!rest) return false;
  if (VARIANT_SUFFIXES.includes(rest)) return true;
  // single number 1-9
  if (/^[1-9]$/.test(rest)) return true;
  // hd + estado, ex hd2, sphd
  if (/^(hd|sd|4k)[a-z0-9]{0,3}$/.test(rest)) return true;
  if (/^[a-z]{2}(hd|sd)?$/.test(rest) && rest.length <= 4) return true;
  return false;
}

export function findChannelMatchSuggestion(
  orphan: DiscoveredChannel,
  mappings: ChannelMapping[],
  builtins: Array<{ name: string; logoKey: LogoKey }>
): ChannelMatchSuggestion | null {
  const orphanNorm = orphan.normalized;
  if (!orphanNorm || orphanNorm.length < 3) return null;

  const targets: SuggestionTarget[] = [];
  for (const m of mappings) {
    if (!m.active) continue;
    if (!m.custom_logo_url && m.logo_key === "none") continue;
    const norm = m.name_normalized || normalizeChannelName(m.name);
    if (!norm || norm === orphanNorm) continue;
    targets.push({ kind: "mapping", mapping: m, displayName: m.name, normalized: norm });
  }
  for (const b of builtins) {
    const norm = normalizeChannelName(b.name);
    if (!norm || norm === orphanNorm) continue;
    targets.push({ kind: "builtin", builtinName: b.name, logoKey: b.logoKey, displayName: b.name, normalized: norm });
  }

  // Order: longest target normalized first (most specific match wins)
  targets.sort((a, b) => b.normalized.length - a.normalized.length);

  let best: ChannelMatchSuggestion | null = null;
  const setBest = (s: ChannelMatchSuggestion) => {
    const rank: Record<SuggestionConfidence, number> = { high: 3, medium: 2, low: 1 };
    if (!best || rank[s.confidence] > rank[best.confidence]) best = s;
  };

  for (const t of targets) {
    if (t.normalized.length < 3) continue;

    // Same normalized: shouldn't happen (mapping would already match), skip.
    if (t.normalized === orphanNorm) continue;

    // 1) Variant suffix (high)
    if (orphanNorm.startsWith(t.normalized)) {
      const rest = orphanNorm.slice(t.normalized.length);
      if (isVariantSuffix(rest)) {
        setBest({ target: t, confidence: "high", reason: `variante "${rest.toUpperCase()}" de ${t.displayName}` });
        continue;
      }
      // Pure prefix without recognized suffix: medium
      if (rest.length <= 5) {
        setBest({ target: t, confidence: "medium", reason: `começa com ${t.displayName}` });
        continue;
      }
    }

    // 2) Substring (medium)
    if (t.normalized.length >= 5 && orphanNorm.includes(t.normalized)) {
      setBest({ target: t, confidence: "medium", reason: `contém ${t.displayName}` });
      continue;
    }

    // 3) Levenshtein (low)
    const max = t.normalized.length >= 8 ? 2 : 1;
    if (distance(orphanNorm, t.normalized, max) <= max) {
      setBest({ target: t, confidence: "low", reason: `parecido com ${t.displayName}` });
    }
  }

  return best;
}

export function useChannelMatchSuggestions(
  orphans: DiscoveredChannel[],
  mappings: ChannelMapping[] | undefined,
  builtins: Array<{ name: string; logoKey: LogoKey }>
) {
  return useMemo(() => {
    const map = new Map<string, ChannelMatchSuggestion>();
    if (!mappings) return map;
    for (const o of orphans) {
      const s = findChannelMatchSuggestion(o, mappings, builtins);
      if (s) map.set(o.normalized, s);
    }
    return map;
  }, [orphans, mappings, builtins]);
}
