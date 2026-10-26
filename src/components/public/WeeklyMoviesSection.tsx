import { useActiveMovies } from "@/hooks/useMovies";
import { Film, Star, ImageOff, Play } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { ContentDetailSheet } from "./ContentDetailSheet";
import { TrailerModal } from "./TrailerModal";
import { PosterRowSkeleton, SectionHeaderSkeleton } from "./ContentSkeletons";
import { useTrailerKey } from "@/hooks/useTrailerKey";
import { useTrailerAvailability } from "@/hooks/useTrailerAvailability";
import { trackContentClick } from "@/lib/analytics";
import { motion } from "framer-motion";
import { forwardRef, useState, useMemo } from "react";

type MovieItem = NonNullable<ReturnType<typeof useActiveMovies>["data"]>[number];

interface MovieCardProps {
  item: MovieItem;
  index: number;
  onSelect: () => void;
  onPlayTrailer: (e: React.MouseEvent) => void;
  hasTrailer: boolean;
}

const MovieCard = forwardRef<HTMLDivElement, MovieCardProps>(({
  item,
  index,
  onSelect,
  onPlayTrailer,
  hasTrailer,
}, ref) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      ref={ref}
      className="snap-start shrink-0 w-[170px] sm:w-[180px]"
      style={{ willChange: "transform, opacity" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
    >
      <div
        className="group relative overflow-hidden rounded-xl border border-border/10 bg-card aspect-[2/3] transition-all duration-250 hover:scale-[1.04] active:scale-[0.97] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        aria-label={`Ver detalhes de ${item.title}`}
      >
        {item.poster_url && !imgErr ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-card gap-1.5">
            <ImageOff className="h-8 w-8 text-muted-foreground/15" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold font-body backdrop-blur-md border bg-primary/20 text-primary border-primary/20">
          🎬 Filme
        </div>

        {item.rating && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-black/40 backdrop-blur-md border border-accent3/20 px-2 py-1">
            <Star className="h-2.5 w-2.5 text-accent3 fill-accent3" />
            <span className="text-[9px] font-bold text-accent3">{Number(item.rating).toFixed(1)}</span>
          </div>
        )}

        {/* Play button overlay — always visible on mobile, centered */}
        {hasTrailer && (
          <button
            onClick={onPlayTrailer}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-primary/80 text-primary-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-10 hover:bg-primary hover:scale-110 active:scale-95 shadow-lg"
            aria-label={`Assistir trailer de ${item.title}`}
            onKeyDown={(e) => { if (e.key === "Enter") onPlayTrailer(e as unknown as React.MouseEvent); }}
          >
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <p className="text-[13px] sm:text-sm font-bold text-foreground leading-tight line-clamp-2 drop-shadow-lg font-body">
            {item.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.year && (
              <span className="text-[10px] text-foreground/50 font-medium font-body">{item.year}</span>
            )}
            {item.genre && (
              <span className="text-[10px] text-primary font-semibold bg-primary/15 rounded-full px-2.5 py-0.5 border border-primary/20 font-body">
                {item.genre.split(",")[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
MovieCard.displayName = "MovieCard";

export const WeeklyMoviesSection = () => {
  const { data: movies, isLoading } = useActiveMovies();
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const [trailerItem, setTrailerItem] = useState<MovieItem | null>(null);

  const availabilityItems = useMemo(
    () => movies?.map((m) => ({ tmdb_id: m.tmdb_id, content_type: "movie" as const })),
    [movies]
  );
  const { available: trailerMap } = useTrailerAvailability(availabilityItems);

  const { trailerKey, loading: trailerLoading } = useTrailerKey(
    trailerItem?.tmdb_id,
    "movie",
    !!trailerItem
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="px-4"><SectionHeaderSkeleton /></div>
        <PosterRowSkeleton />
      </div>
    );
  }

  if (!movies?.length) return null;

  return (
    <div className="space-y-4">
      <div className="px-4">
        <SectionHeader icon={Film} title={`Sugestões de Filmes (${movies.length})`} subtitle="Destaques da semana" hideBrand />
      </div>
      <div data-horizontal-scroll className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-2">
        {movies.map((item, idx) => (
          <MovieCard
            key={item.id}
            item={item}
            index={idx}
            hasTrailer={trailerMap.get(item.tmdb_id) === true}
            onSelect={() => {
              trackContentClick({
                surface: "weekly-movies",
                content_type: "movie",
                content_id: item.tmdb_id ?? item.id,
                content_title: item.title,
                position: idx,
                action: "open",
              });
              setSelected(item);
            }}
            onPlayTrailer={(e) => {
              e.stopPropagation();
              trackContentClick({
                surface: "weekly-movies",
                content_type: "movie",
                content_id: item.tmdb_id ?? item.id,
                content_title: item.title,
                position: idx,
                action: "trailer",
              });
              setTrailerItem(item);
            }}
          />
        ))}
      </div>

      <ContentDetailSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        item={selected ? { ...selected, content_type: "movie" } : null}
      />

      <TrailerModal
        open={!!trailerItem}
        onClose={() => setTrailerItem(null)}
        trailerKey={trailerKey}
        loading={trailerLoading}
        title={trailerItem?.title}
      />
    </div>
  );
};
