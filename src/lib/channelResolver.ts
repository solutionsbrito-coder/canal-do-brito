/**
 * Resolução central de nomes de canais.
 *
 * Usado pelo admin (importação/alertas) e pelo público (badges) para que
 * "ESPN2", "Espn 2" e "ESPN 2 HD" virem sempre "ESPN 2", com a mesma logo e cor.
 *
 * Ordem de resolução:
 *  1. match exato com nome oficial cadastrado (name_normalized);
 *  2. match por alias cadastrado (alias_normalized);
 *  3. fallback por normalização simples + regras canônicas embutidas
 *     (sem acento, sem espaços/símbolos, sem sufixo HD/4K/FHD).
 */
import { normalizeChannelName } from "@/components/public/channelLogos";
import type { ChannelMapping } from "@/hooks/useChannelMappings";

export type ChannelResolutionStatus =
  | "official" // nome oficial cadastrado
  | "alias" // alias cadastrado
  | "canonical" // regra embutida (não cadastrado no banco)
  | "unknown"; // nada encontrado — mantém o texto original

export type ChannelResolution = {
  /** Texto original informado. */
  input: string;
  /** Nome a exibir (oficial quando conhecido; original quando desconhecido). */
  name: string;
  /** Chave normalizada do nome exibido. */
  key: string;
  status: ChannelResolutionStatus;
  mapping?: ChannelMapping;
  /** true quando o nome exibido difere do texto original. */
  changed: boolean;
};

/** Sufixos de qualidade que não mudam o canal. */
const QUALITY_SUFFIX = /(fhd|uhd|hd|4k|sd)$/;

/**
 * Regras canônicas embutidas: chave normalizada (regex) -> nome oficial.
 * Mantêm o app funcional mesmo sem cadastro no banco.
 */
const CANONICAL_RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^espn(brasil)?$/, () => "ESPN"],
  [/^espn([2-6])$/, (m) => `ESPN ${m[1]}`],
  [/^spor?tv1?$/, () => "SporTV"],
  [/^spor?tv([2-4])$/, (m) => `SporTV ${m[1]}`],
  [/^premiere(fc|clubes)?$/, () => "Premiere"],
  [/^pfc$/, () => "Premiere"],
  [/^premiere([1-9])$/, () => "Premiere"],
  [/^disney(plus)?$/, () => "Disney+"],
  [/^youtube$|^yt$/, () => "YouTube"],
  [/^cazetv$/, () => "CazéTV"],
  [/^bandsports$/, () => "BandSports"],
  [/^(canal)?goat$|^youtubecanalgoat$/, () => "Canal GOAT"],
  [/^nsports$|^youtubensports$|^nsportsyoutube$/, () => "Nsports"],
  [/^xsports$/, () => "Xsports"],
  [/^paramount(plus)?$/, () => "Paramount+"],
  [/^(canal)?combate$/, () => "Combate"],
  [/^(tv)?globo(sp|rj|mg)?$|^gptv$/, () => "Globo"],
  [/^(tv)?record(tv)?$/, () => "Record"],
  [/^(tv)?band$|^bandeirantes$/, () => "Band"],
  [/^(amazon)?primevideo$/, () => "Prime Video"],
  [/^(hbo)?max$/, () => "Max"],
  [/^globoplay$/, () => "Globoplay"],
  [/^tntsports$|^tnt$/, () => "TNT Sports"],
  [/^appletv(plus)?$/, () => "Apple TV"],
  [/^netflix$/, () => "Netflix"],
  [/^dazn$/, () => "DAZN"],
  [/^sbt$/, () => "SBT"],
  [/^space$/, () => "Space"],
  [/^getv$/, () => "ge tv"],
];

/** Remove sufixos de qualidade (HD/4K) da chave normalizada. */
export function stripQualitySuffix(key: string): string {
  const stripped = key.replace(QUALITY_SUFFIX, "");
  // Não deixa a chave vazia nem remove de nomes curtos ambíguos ("hd" isolado).
  return stripped.length >= 2 ? stripped : key;
}

/** Aplica regras canônicas embutidas a uma chave normalizada. */
export function canonicalChannelName(key: string): string | null {
  for (const [re, fmt] of CANONICAL_RULES) {
    const m = key.match(re);
    if (m) return fmt(m);
  }
  return null;
}

function fromMapping(input: string, m: ChannelMapping, status: "official" | "alias"): ChannelResolution {
  return {
    input,
    name: m.name,
    key: m.name_normalized || normalizeChannelName(m.name),
    status,
    mapping: m,
    changed: m.name !== input.trim(),
  };
}

/**
 * Resolve um nome de canal para seu nome oficial (quando conhecido).
 * `mappings` é o Map retornado por `useChannelMappings` (nome e aliases → mapping).
 */
export function resolveChannel(input: string, mappings?: Map<string, ChannelMapping> | null): ChannelResolution {
  const raw = (input ?? "").trim();
  const key = normalizeChannelName(raw);
  if (!key) return { input, name: raw, key: "", status: "unknown", changed: false };

  // 1/2. Exato ou alias (o Map já contém os dois; o status é inferido pelo nome).
  const direct = mappings?.get(key);
  if (direct) return fromMapping(input, direct, direct.name_normalized === key ? "official" : "alias");

  // 3. Fallback simples: sem sufixo HD/4K → cadastro
  const bare = stripQualitySuffix(key);
  if (bare !== key) {
    const viaBare = mappings?.get(bare);
    if (viaBare) return fromMapping(input, viaBare, viaBare.name_normalized === bare ? "official" : "alias");
  }

  // 3b. Regra canônica embutida → tenta cadastro pelo nome canônico
  const canonical = canonicalChannelName(bare);
  if (canonical) {
    const cKey = normalizeChannelName(canonical);
    const viaCanonical = mappings?.get(cKey);
    if (viaCanonical) return fromMapping(input, viaCanonical, "alias");
    return { input, name: canonical, key: cKey, status: "canonical", changed: canonical !== raw };
  }

  return { input, name: raw, key, status: "unknown", changed: false };
}

/** Resolve uma lista, removendo duplicatas após a normalização (mantém a ordem). */
export function resolveChannels(
  inputs: readonly string[] | null | undefined,
  mappings?: Map<string, ChannelMapping> | null,
): ChannelResolution[] {
  const out: ChannelResolution[] = [];
  const seen = new Set<string>();
  for (const c of inputs ?? []) {
    if (!c || typeof c !== "string" || !c.trim()) continue;
    const r = resolveChannel(c, mappings);
    const dedupeKey = r.key || r.input.trim().toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(r);
  }
  return out;
}

/** Atalho: só os nomes oficiais, deduplicados. */
export function normalizeChannelList(
  inputs: readonly string[] | null | undefined,
  mappings?: Map<string, ChannelMapping> | null,
): string[] {
  return resolveChannels(inputs, mappings).map((r) => r.name);
}

/** Um mapeamento tem logo quando usa a biblioteca ou upload próprio. */
export function mappingHasLogo(m: ChannelMapping | undefined | null): boolean {
  if (!m) return false;
  return !!m.custom_logo_url || (!!m.logo_key && m.logo_key !== "none");
}
