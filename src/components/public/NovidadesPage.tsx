/**
 * Aba "Filmes & Séries" — visual cinematográfico (streaming premium).
 *
 * Componentes legacy intencionalmente não importados aqui (mantidos no repo
 * para uso futuro / testes existentes): NovidadesCard, WeeklyMoviesSection,
 * WeeklySeriesSection, HeroBanner.
 */
import { useEffect, useMemo, useState } from "react";
import { Grid, Sparkles } from "lucide-react";

import type { NewsRelease } from "@/hooks/useNewsReleases";
import { useTrailerAvailability } from "@/hooks/useTrailerAvailability";
import { useTrailerKey } from "@/hooks/useTrailerKey";
import { trackContentClick } from "@/lib/analytics";

import { ContentDetailSheet } from "@/components/public/ContentDetailSheet";
import { TrailerModal } from "@/components/public/TrailerModal";
import { ContentCard } from "@/components/public/novidades/ContentCard";

import { CinemaHero } from "@/components/public/cinema/CinemaHero";
import { PosterRail } from "@/components/public/cinema/PosterRail";
import { CinemaCategoryRail, type CinemaCategory } from "@/components/public/cinema/CinemaCategoryRail";
import { PremiumCTA } from "@/components/public/cinema/PremiumCTA";
import { useCinemaShelves, type CinemaItem } from "@/components/public/cinema/useCinemaShelves";

/** Defer trailer prefetch until browser is idle — não compete com primeira renderização. */
const useDeferred = <T,>(value: T, ready: boolean): T | undefined => {
  const [out, setOut] = useState<T | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    const ric: typeof requestIdleCallback | undefined =
      typeof window !== "undefined" ? (window as any).requestIdleCallback : undefined;
    const cic: typeof cancelIdleCallback | undefined =
      typeof window !== "undefined" ? (window as any).cancelIdleCallback : undefined;
    if (ric) {
      const h = ric(() => setOut(value), { timeout: 1500 });
      return () => cic?.(h);
    }
    const t = window.setTimeout(() => setOut(value), 600);
    return () => window.clearTimeout(t);
  }, [value, ready]);
  return out;
};

type FilterId = "all" | "movie" | "series" | "lancamento" | "nova_temporada" | "estreia" | "exclusivo";

type SortId = "recent" | "rating" | "title" | "year";

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "recent", label: "Mais recentes" },
  { id: "rating", label: "Melhor avaliados" },
  { id: "title", label: "A–Z" },
  { id: "year", label: "Ano" },
];

const PosterSkeletonRow = () => (
  <div className="flex gap-3 overflow-hidden px-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="shrink-0 w-[42vw] max-w-[164px] sm:w-40 md:w-44 space-y-2">
        <div className="aspect-[2/3] rounded-xl skeleton-shimmer" />
        <div className="h-3 rounded skeleton-shimmer" />
      </div>
    ))}
  </div>
);

const HeroSkeleton = () => (
  <div className="relative h-[62vh] min-h-[460px] sm:h-[70vh] overflow-hidden">
    <div className="absolute inset-0 skeleton-shimmer" />
    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
    <div className="absolute bottom-7 left-5 right-5 sm:left-10 space-y-3 max-w-md">
      <div className="h-4 w-32 rounded-full skeleton-shimmer" />
      <div className="h-10 w-3/4 rounded skeleton-shimmer" />
      <div className="h-3 w-2/3 rounded skeleton-shimmer" />
      <div className="h-12 w-44 rounded-full skeleton-shimmer" />
    </div>
  </div>
);

export const NovidadesPage = () => {
  // (useNewsReleases() = useActiveNewsReleases): we need the same data the hook provides
  // via useCinemaShelves — but we also need raw releases for the filtered grid + search.
  // useCinemaShelves devolve `releases`, então não duplicamos requisições.
  const cinema = useCinemaShelves();
  const releases = cinema.releases;

  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("recent");
  
  const [selected, setSelected] = useState<NewsRelease | null>(null);
  const [trailerItem, setTrailerItem] = useState<CinemaItem | null>(null);

  // Defere o prefetch de trailers até o navegador estar ocioso E o hero estar pronto.
  const deferredLookup = useDeferred(cinema.trailerLookup, !cinema.isHeroLoading);
  const { available: trailerMap } = useTrailerAvailability(deferredLookup);

  // Trailer key on demand (apenas quando o usuário aciona o CTA).
  const { trailerKey, loading: trailerLoading } = useTrailerKey(
    trailerItem?.tmdb_id,
    trailerItem?.content_type,
    !!trailerItem
  );

  // Estatísticas para os chips — usam o conjunto unificado para movie/series e
  // apenas releases para os badges (lançamento, nova_temporada, estreia, exclusivo).
  const stats = useMemo(() => {
    const isMovie = (i: NewsRelease) => i.content_type === "movie";
    const isSeries = (i: NewsRelease) => i.content_type === "series" || i.content_type === "tv";
    return {
      all: cinema.allItems.length,
      movie: cinema.allItems.filter(isMovie).length,
      series: cinema.allItems.filter(isSeries).length,
      lancamento: releases.filter((i) => i.badge_type === "lancamento").length,
      nova_temporada: releases.filter((i) => i.badge_type === "nova_temporada").length,
      estreia: releases.filter((i) => i.badge_type === "estreia").length,
      exclusivo: releases.filter((i) => i.badge_type === "exclusivo").length,
    } as Record<FilterId, number>;
  }, [releases, cinema.allItems]);

  const filtered = useMemo(() => {
    let list: NewsRelease[];
    if (filter === "all") list = cinema.allItems;
    else if (filter === "movie") list = cinema.allItems.filter((i) => i.content_type === "movie");
    else if (filter === "series")
      list = cinema.allItems.filter((i) => i.content_type === "series" || i.content_type === "tv");
    else list = releases.filter((i) => i.badge_type === filter);

    const sorted = [...list];
    if (sort === "rating") sorted.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    else if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    else if (sort === "year") sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    return sorted;
  }, [cinema.allItems, releases, filter, sort]);

  const categories: CinemaCategory[] = useMemo(() => {
    const all: { id: FilterId; emoji: string; label: string }[] = [
      { id: "all", emoji: "✨", label: "Todos" },
      { id: "movie", emoji: "🎬", label: "Filmes" },
      { id: "series", emoji: "📺", label: "Séries" },
      { id: "lancamento", emoji: "🆕", label: "Lançamentos" },
      { id: "nova_temporada", emoji: "🎞️", label: "Novas Temporadas" },
      { id: "estreia", emoji: "⭐", label: "Estreias" },
      { id: "exclusivo", emoji: "👑", label: "Exclusivos" },
    ];
    return all
      .filter((c) => c.id === "all" || (stats[c.id] ?? 0) > 0)
      .map((c) => ({ id: c.id, emoji: c.emoji, label: c.label, count: c.id === "all" ? undefined : stats[c.id] }));
  }, [stats]);

  // Resolve um item da hero/poster para o shape esperado pelo ContentDetailSheet.
  const openDetailsFromCinema = (item: CinemaItem) => {
    trackContentClick({
      surface: "novidades_page",
      content_type: item.content_type ?? "news",
      content_id: item.tmdb_id ?? item.id,
      content_title: item.title,
      action: "open",
    });
    // Tenta achar release equivalente (preserva ids/badges); senão monta wrapper.
    const releaseMatch =
      item.source === "release"
        ? releases.find((r) => `release:${r.id}` === item.id)
        : undefined;
    if (releaseMatch) {
      setSelected(releaseMatch);
      return;
    }
    setSelected({
      id: item.id,
      title: item.title,
      content_type: item.content_type,
      badge_type: item.badge_type ?? "novidade",
      image_url: item.poster_url,
      overview: item.overview,
      year: item.year,
      rating: item.rating,
      tmdb_id: item.tmdb_id,
      active: true,
      display_order: 0,
      added_by: null,
      created_at: new Date().toISOString(),
      genres: item.genres,
      runtime: null,
      seasons: null,
      tagline: null,
      backdrop_url: item.backdrop_url,
    });
  };

  const handleSelectRelease = (item: NewsRelease) => {
    trackContentClick({
      surface: "novidades_page",
      content_type: item.content_type ?? "news",
      content_id: item.tmdb_id ?? item.id,
      content_title: item.title,
      action: "open",
    });
    setSelected(item);
  };

  const playTrailer = (item: CinemaItem) => {
    trackContentClick({
      surface: "novidades_page",
      content_type: item.content_type ?? "news",
      content_id: item.tmdb_id ?? item.id,
      content_title: item.title,
      action: "trailer",
    });
    setTrailerItem(item);
  };

  const filterLabel = categories.find((c) => c.id === filter)?.label ?? "Todos";
  const isEmptyAll =
    !cinema.isLoading && cinema.heroItems.length === 0 && cinema.shelves.length === 0;

  return (
    <div
      className="space-y-8 min-h-[80vh] animate-fade-in"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* HERO cinematográfico */}
      {cinema.isHeroLoading ? (
        <HeroSkeleton />
      ) : (
        <CinemaHero
          items={cinema.heroItems}
          trailerAvailable={trailerMap}
          onPlayTrailer={playTrailer}
          onOpenDetails={openDetailsFromCinema}
          pausedExternally={!!selected || !!trailerItem}
        />
      )}

      {/* Categorias */}
      {categories.length > 1 && (
        <CinemaCategoryRail
          categories={categories}
          active={filter}
          onChange={(id) => setFilter(id as FilterId)}
        />
      )}

      {/* Trilhas (somente quando filtro = Todos) */}
      {filter === "all" && (
        <div className="space-y-8">
          {cinema.isLoading && cinema.shelves.length === 0 ? (
            <>
              <PosterSkeletonRow />
              <PosterSkeletonRow />
            </>
          ) : (
            cinema.shelves.map((shelf) => (
              <PosterRail
                key={shelf.id}
                title={shelf.title}
                emoji={shelf.emoji}
                items={shelf.items}
                onSelect={openDetailsFromCinema}
              />
            ))
          )}
        </div>
      )}

      {/* Empty state global (sem dados em nenhum lugar) */}
      {filter === "all" && isEmptyAll && (
        <div className="px-4">
          <div className="rounded-2xl border border-border/50 bg-surface-2 p-10 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-primary/60 mx-auto" />
            <p className="text-base font-bold text-foreground font-body">Em breve novos títulos</p>
            <p className="text-xs text-muted-foreground font-body max-w-xs mx-auto">
              Estamos preparando novidades. Volte logo para conferir os próximos lançamentos.
            </p>
          </div>
        </div>
      )}

      {/* Grid filtrada (só quando há filtro ativo) */}
      {filter !== "all" && (
        <div className="space-y-3">
          <div className="px-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl tracking-wide text-foreground min-w-0 truncate">
              {filterLabel}
              <span className="ml-2 text-sm text-muted-foreground font-body font-normal tabular-nums">
                ({filtered.length})
              </span>
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <label className="sr-only" htmlFor="novidades-sort">Ordenar</label>
              <select
                id="novidades-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                className="text-xs bg-surface-2 border border-border/50 rounded-lg px-2 py-1.5 text-muted-foreground font-body focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-11"
                aria-label="Ordenar resultados"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <Grid className="w-4 h-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          {cinema.isLoading ? (
            <PosterSkeletonRow />
          ) : filtered.length === 0 ? (
            <div className="px-4">
              <div className="rounded-2xl border border-border/50 bg-surface-2 p-8 text-center space-y-2">
                <p className="text-sm font-bold text-foreground font-body">Nada por aqui ainda</p>
                <p className="text-xs text-muted-foreground font-body">
                  Tente outro filtro ou volte mais tarde para conferir as novidades.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4">
              {filtered.map((item) => (
                <ContentCard key={item.id} item={item} onSelect={handleSelectRelease} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Premium — sempre ao final da página */}
      {!cinema.isLoading && <PremiumCTA />}

      <ContentDetailSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        item={
          selected
            ? {
                title: selected.title,
                overview: selected.overview,
                poster_url: selected.image_url,
                backdrop_url: selected.backdrop_url,
                rating: selected.rating,
                year: selected.year,
                genre: selected.genres,
                tmdb_id: selected.tmdb_id,
                content_type: selected.content_type,
              }
            : null
        }
      />

      <TrailerModal
        open={!!trailerItem}
        onClose={() => setTrailerItem(null)}
        trailerKey={trailerKey}
        loading={trailerLoading}
        title={trailerItem?.title}
        fallbackQuery={trailerItem ? `${trailerItem.title} trailer oficial` : undefined}
      />
    </div>
  );
};


export default NovidadesPage;
