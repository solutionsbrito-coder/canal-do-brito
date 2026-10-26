// Registry centralizado de logos. Para adicionar uma nova:
// 1. Salve o PNG/SVG em src/assets/brand-logos/
// 2. Importe abaixo
// 3. Adicione ao LOGO_REGISTRY com label e (opcional) lightChip
import bandLogo from "@/assets/brand-logos/band.png";
import bandsportsLogo from "@/assets/brand-logos/bandsports.png";
import benjaLogo from "@/assets/brand-logos/canaldobenja.png";
import cazetvLogo from "@/assets/brand-logos/cazetv.png";
import combateLogo from "@/assets/brand-logos/combate.png";
import daznLogo from "@/assets/brand-logos/dazn.png";
import disneyLogo from "@/assets/brand-logos/disneyplus.png";
import espnLogo from "@/assets/brand-logos/espn.png";
import globoLogo from "@/assets/brand-logos/globo.png";
import globoplayLogo from "@/assets/brand-logos/globoplay.png";
import goatLogo from "@/assets/brand-logos/goat.png";
import maxLogo from "@/assets/brand-logos/max.png";
import nbalpLogo from "@/assets/brand-logos/nbaleaguepass.png";
import netflixLogo from "@/assets/brand-logos/netflix.png";
import nsportsLogo from "@/assets/brand-logos/nsports.png";
import onefootballLogo from "@/assets/brand-logos/onefootball.png";
import paramountLogo from "@/assets/brand-logos/paramountplus.png";
import premiereLogo from "@/assets/brand-logos/premiere.png";
import primeLogo from "@/assets/brand-logos/primevideo.png";
import recordLogo from "@/assets/brand-logos/record.png";
import redetvLogo from "@/assets/brand-logos/redetv.png";
import sbtLogo from "@/assets/brand-logos/sbt.png";
import snetLogo from "@/assets/brand-logos/snet.png";
import spaceLogo from "@/assets/brand-logos/space.png";
import sportvLogo from "@/assets/brand-logos/sportv.png";
import tntLogo from "@/assets/brand-logos/tntsports.png";
import youtubeLogo from "@/assets/brand-logos/youtube.png";
import xsportsLogo from "@/assets/brand-logos/xsports.png";
import appletvLogo from "@/assets/brand-logos/appletv.svg";

export type LogoEntry = { src: string; label: string; lightChip?: boolean };

export const LOGO_REGISTRY: Record<string, LogoEntry> = {
  band:       { src: bandLogo,       label: "Band" },
  bandsports: { src: bandsportsLogo, label: "BandSports" },
  benja:      { src: benjaLogo,      label: "Canal do Benja", lightChip: true },
  cazetv:     { src: cazetvLogo,     label: "Cazé TV" },
  combate:    { src: combateLogo,    label: "Combate", lightChip: true },
  dazn:       { src: daznLogo,       label: "DAZN" },
  disney:     { src: disneyLogo,     label: "Disney+" },
  espn:       { src: espnLogo,       label: "ESPN" },
  globo:      { src: globoLogo,      label: "Globo", lightChip: true },
  globoplay:  { src: globoplayLogo,  label: "Globoplay" },
  goat:       { src: goatLogo,       label: "Canal GOAT" },
  max:        { src: maxLogo,        label: "Max / HBO" },
  nbalp:      { src: nbalpLogo,      label: "NBA League Pass", lightChip: true },
  netflix:    { src: netflixLogo,    label: "Netflix" },
  nsports:    { src: nsportsLogo,    label: "NSports" },
  onefootball:{ src: onefootballLogo, label: "OneFootball" },
  paramount:  { src: paramountLogo,  label: "Paramount+" },
  premiere:   { src: premiereLogo,   label: "Premiere" },
  prime:      { src: primeLogo,      label: "Prime Video" },
  record:     { src: recordLogo,     label: "Record" },
  redetv:     { src: redetvLogo,     label: "RedeTV!", lightChip: true },
  sbt:        { src: sbtLogo,        label: "SBT" },
  snet:       { src: snetLogo,       label: "SNet" },
  space:      { src: spaceLogo,      label: "Space" },
  sportv:     { src: sportvLogo,     label: "SporTV" },
  tnt:        { src: tntLogo,        label: "TNT Sports" },
  youtube:    { src: youtubeLogo,    label: "YouTube" },
  xsports:    { src: xsportsLogo,    label: "X Sports" },
  apple:      { src: appletvLogo,    label: "Apple TV" },
};

export type LogoKey = keyof typeof LOGO_REGISTRY | "none";

export const LOGO_OPTIONS: Array<{ key: LogoKey; label: string }> = [
  { key: "none", label: "Sem logo (emoji)" },
  ...Object.entries(LOGO_REGISTRY).map(([k, v]) => ({ key: k as LogoKey, label: v.label })),
];

/**
 * Normaliza o nome de um canal removendo acentos e TODO caractere
 * não alfanumérico — igual à normalização usada no banco
 * (`lower(regexp_replace(unaccent(x), '[^a-z0-9]+', '', 'g'))`),
 * garantindo que front e back cheguem sempre à mesma chave.
 */
export const normalizeChannelName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

/** UFs e fragmentos que sobram quando o parser quebra "Globo (SP, MG)". */
const UF_FRAGMENTS = new Set([
  "ac","al","ap","am","ba","ce","df","es","go","ma","mt","ms","mg","pa","pb",
  "pr","pe","pi","rj","rn","rs","ro","rr","sc","sp","se","to",
]);

/**
 * Detecta "canais" que na verdade são resto de split de parênteses
 * (ex.: "MG)", "PR", "RS") e não devem gerar badge nem virar órfão.
 */
export function isChannelFragment(name: string): boolean {
  const norm = normalizeChannelName(name);
  if (!norm) return true;
  if (UF_FRAGMENTS.has(norm)) return true;
  return norm.length <= 1;
}

const INITIALS_STOPWORDS = new Set([
  "tv","canal","canais","youtube","do","da","de","dos","das","e","the","oficial",
]);

/** Iniciais legíveis para canais sem arte (ex.: "LNF TV" -> "LNF"). */
export function channelInitials(name: string): string {
  const cleaned = name.replace(/\(.*?\)?/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  const all = cleaned.split(/\s+/).filter(Boolean);
  const words = all.filter((w) => !INITIALS_STOPWORDS.has(w.toLowerCase()));
  const base = words.length ? words : all;
  if (base.length >= 2) {
    return base.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
  }
  const single = base[0] ?? name;
  return single.slice(0, 3).toUpperCase() || "TV";
}
