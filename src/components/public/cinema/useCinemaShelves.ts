import { useMemo } from "react";
import { useActiveNewsReleases, type NewsRelease } from "@/hooks/useNewsReleases";
import { useActiveMovies } from "@/hooks/useMovies";
import { useActiveSeries } from "@/hooks/useSeries";

/**
 * Normalized item consumed by the cinema UI (hero, posters, CTA).
 * Source-agnostic: comes from news_releases, featured_movies or featured_series.
 */
export interface CinemaItem {
  id: string;
  source: "release" | "movie" | "series";
  title: string;
  content_type: string; // "movie" | "series" | "tv" | other
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
  rating: number | null;
  year: number | null;
  genres: string | null;
  tmdb_id: number | null;
  badge_type?: string;
}

export interface CinemaShelf {
  id: "lancamentos" | "filmes" | "series";
  title: string;
  emoji: string;
  items: CinemaItem[];
}

const fromRelease = (r: NewsRelease): CinemaItem => ({
  id: `release:${r.id}`,
  source: "release",
  title: r.title,
  content_type: r.content_type ?? "news",
  poster_url: r.image_url,
  backdrop_url: r.backdrop_url,
  overview: r.overview,
  rating: r.rating,
  year: r.year,
  genres: r.genres,
  tmdb_id: r.tmdb_id,
  badge_type: r.badge_type,
});

interface UseCinemaShelvesResult {
  isLoading: boolean;
  /** True only while the hero data source (releases) is loading — prateleiras podem chegar depois. */
  isHeroLoading: boolean;
  isError: boolean;
  heroItems: CinemaItem[];
  shelves: CinemaShelf[];
  /** Combined list (deduped by tmdb_id when possible) for trailer prefetch. */
  trailerLookup: Array<{ tmdb_id: number | null; content_type: string }>;
  releases: NewsRelease[]; // raw releases for filtered grid + search modal
  /** Unified list (releases + featured movies + featured series) in NewsRelease shape, deduped by tmdb_id. */
  allItems: NewsRelease[];
}

export const useCinemaShelves = (): UseCinemaShelvesResult => {
  const releasesQ = useActiveNewsReleases();
  const moviesQ = useActiveMovies();
  const seriesQ = useActiveSeries();

  const releases = releasesQ.data ?? [];
  const movies = moviesQ.data ?? [];
  const series = seriesQ.data ?? [];

  return useMemo(() => {
    const releaseItems = releases.map(fromRelease);

    const heroPriority = (b?: string) =>
      b === "lancamento" ? 0 : b === "estreia" ? 1 : b === "exclusivo" ? 2 : b === "nova_temporada" ? 3 : 4;

    const heroPool = releaseItems.filter((i) => i.backdrop_url || i.poster_url);
    const heroItems = [...heroPool]
      .sort((a, b) => heroPriority(a.badge_type) - heroPriority(b.badge_type))
      .slice(0, 5);

    const lancamentos = releaseItems.filter(
      (i) => i.badge_type === "lancamento" || i.badge_type === "estreia"
    );

    const movieShelf: CinemaItem[] = movies.map((m) => ({
      id: `movie:${m.id}`,
      source: "movie",
      title: m.title,
      content_type: "movie",
      poster_url: m.poster_url,
      backdrop_url: m.backdrop_url,
      overview: m.overview,
      rating: m.rating,
      year: m.year,
      genres: m.genre,
      tmdb_id: m.tmdb_id,
    }));

    const seriesShelf: CinemaItem[] = series.map((s) => ({
      id: `series:${s.id}`,
      source: "series",
      title: s.title,
      content_type: "series",
      poster_url: s.poster_url,
      backdrop_url: s.backdrop_url,
      overview: s.overview,
      rating: s.rating,
      year: s.year,
      genres: s.genre,
      tmdb_id: s.tmdb_id,
    }));

    const shelves: CinemaShelf[] = [
      { id: "lancamentos", title: "Lançamentos", emoji: "🆕", items: lancamentos },
      { id: "filmes", title: "Filmes da Semana", emoji: "🎬", items: movieShelf },
      { id: "series", title: "Séries da Semana", emoji: "📺", items: seriesShelf },
    ].filter((s) => s.items.length > 0) as CinemaShelf[];

    const trailerLookup = [...releaseItems, ...movieShelf, ...seriesShelf]
      .filter((i) => i.tmdb_id)
      .map((i) => ({ tmdb_id: i.tmdb_id, content_type: i.content_type }));

    // Build unified list in NewsRelease shape, deduped by tmdb_id (releases win).
    const seenTmdb = new Set<number>();
    releases.forEach((r) => { if (r.tmdb_id) seenTmdb.add(r.tmdb_id); });
    const movieAsRelease: NewsRelease[] = movies
      .filter((m) => !m.tmdb_id || !seenTmdb.has(m.tmdb_id))
      .map((m) => ({
        id: `movie:${m.id}`,
        title: m.title,
        content_type: "movie",
        badge_type: "novidade",
        image_url: m.poster_url,
        overview: m.overview,
        year: m.year,
        rating: m.rating,
        tmdb_id: m.tmdb_id,
        active: true,
        display_order: 0,
        added_by: null,
        created_at: m.created_at,
        genres: m.genre,
        runtime: null,
        seasons: null,
        tagline: null,
        backdrop_url: m.backdrop_url,
      }));
    movies.forEach((m) => { if (m.tmdb_id) seenTmdb.add(m.tmdb_id); });
    const seriesAsRelease: NewsRelease[] = series
      .filter((s) => !s.tmdb_id || !seenTmdb.has(s.tmdb_id))
      .map((s) => ({
        id: `series:${s.id}`,
        title: s.title,
        content_type: "series",
        badge_type: "novidade",
        image_url: s.poster_url,
        overview: s.overview,
        year: s.year,
        rating: s.rating,
        tmdb_id: s.tmdb_id,
        active: true,
        display_order: 0,
        added_by: null,
        created_at: s.created_at,
        genres: s.genre,
        runtime: null,
        seasons: null,
        tagline: null,
        backdrop_url: s.backdrop_url,
      }));

    const allItems: NewsRelease[] = [...releases, ...movieAsRelease, ...seriesAsRelease];

    return {
      isLoading: releasesQ.isLoading || moviesQ.isLoading || seriesQ.isLoading,
      isHeroLoading: releasesQ.isLoading,
      isError: releasesQ.isError || moviesQ.isError || seriesQ.isError,
      heroItems,
      shelves,
      trailerLookup,
      releases,
      allItems,
    };
  }, [releases, movies, series, releasesQ.isLoading, moviesQ.isLoading, seriesQ.isLoading, releasesQ.isError, moviesQ.isError, seriesQ.isError]);
};
