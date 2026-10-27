/**
 * Carrosséis do catálogo próprio (Lote 2).
 *
 * Regra: SÓ entra título disponível no catálogo próprio. Títulos com
 * available_in_catalog = false NUNCA aparecem aqui como disponíveis —
 * nem em "Novos", nem em "Em alta", nem em "Maratonar". (Títulos
 * pré-Lote 1 chegam com null e valem como disponíveis, igual ao
 * padrão do Lote 1, até o admin preencher o formulário.)
 *
 * "Sai em breve" = leaves_at dentro dos próximos 14 dias (ou hoje).
 * A comparação usa a data local de Brasília, como o resto do app.
 */

import { normalizeCatalogFields } from "@/lib/catalogFields";
import { getLocalDateString } from "@/lib/gameUtils";

export interface CatalogTitle {
  id: string;
  kind: "movie" | "series";
  title: string;
  poster_url: string | null;
  year: number | null;
  genre: string | null;
  created_at: string;
  available_in_catalog: boolean;
  catalog_category: string | null;
  featured: boolean;
  leaves_at: string | null;
}

type RawTitle = {
  id: string;
  title: string;
  poster_url: string | null;
  year: number | null;
  genre: string | null;
  created_at: string;
  available_in_catalog?: boolean | null;
  catalog_category?: string | null;
  featured?: boolean | null;
  leaves_at?: string | null;
};

export function toCatalogTitle(
  kind: "movie" | "series",
  raw: RawTitle,
): CatalogTitle {
  const f = normalizeCatalogFields({
    available_in_catalog: raw.available_in_catalog ?? undefined,
    catalog_category: raw.catalog_category,
    featured: raw.featured ?? undefined,
    leaves_at: raw.leaves_at,
  });
  return {
    id: raw.id,
    kind,
    title: raw.title,
    poster_url: raw.poster_url,
    year: raw.year,
    genre: raw.genre,
    created_at: raw.created_at,
    available_in_catalog: f.available_in_catalog,
    catalog_category: f.catalog_category,
    featured: f.featured,
    leaves_at: f.leaves_at,
  };
}

/** Só os disponíveis — o filtro que todos os carrosséis usam. */
export function onlyAvailable(titles: CatalogTitle[]): CatalogTitle[] {
  return titles.filter((t) => t.available_in_catalog);
}

/** leaves_at hoje ou nos próximos `days` dias (padrão 14). */
export function isLeavingSoon(
  leavesAt: string | null,
  days = 14,
  today: string = getLocalDateString(),
): boolean {
  if (!leavesAt) return false;
  const [y, m, d] = leavesAt.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!y || !ty) return false;
  const leave = Date.UTC(y, m - 1, d);
  const now = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((leave - now) / 86_400_000);
  return diffDays >= 0 && diffDays <= days;
}

export interface CatalogCarousels {
  /** Disponíveis, mais recentes primeiro. */
  novos: CatalogTitle[];
  /** Disponíveis marcados como destaque no admin. */
  emAlta: CatalogTitle[];
  /** Séries disponíveis (maratona de fim de semana); se não houver
   *  série, completa com filmes disponíveis. */
  maratonar: CatalogTitle[];
}

export function buildCatalogCarousels(
  movies: RawTitle[],
  series: RawTitle[],
): CatalogCarousels {
  const all = onlyAvailable([
    ...movies.map((m) => toCatalogTitle("movie", m)),
    ...series.map((s) => toCatalogTitle("series", s)),
  ]);
  const byRecent = [...all].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const novos = byRecent.slice(0, 12);
  const emAlta = all.filter((t) => t.featured).slice(0, 12);
  const seriesOnly = all.filter((t) => t.kind === "series");
  const maratonar =
    seriesOnly.length > 0 ? seriesOnly.slice(0, 12) : byRecent.slice(0, 12);
  return { novos, emAlta, maratonar };
}
