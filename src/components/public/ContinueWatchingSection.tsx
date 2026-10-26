import { useAuth } from "@/contexts/AuthContext";
import { useWatchProgress, useUpsertProgress } from "@/hooks/useWatchProgress";
import { Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { ContentDetailSheet } from "./ContentDetailSheet";

export const ContinueWatchingSection = () => {
  const { user } = useAuth();
  const { data: items, isLoading } = useWatchProgress();
  const upsertProgress = useUpsertProgress();
  const [selectedItem, setSelectedItem] = useState<(typeof items)[number] | null>(null);

  // Don't render if user is not logged in, or no items in progress
  if (!user) return null;
  if (isLoading) return <LoadingSkeleton />;
  if (!items || items.length === 0) return null;

  const handleClick = (item: (typeof items)[number]) => {
    // Simula progresso randômico ao clicar (30-80%)
    const simulatedProgress = Math.floor(Math.random() * 50) + 30;
    upsertProgress.mutate({
      content_id: item.content_id,
      content_type: item.content_type,
      title: item.title,
      poster_url: item.poster_url,
      backdrop_url: item.backdrop_url,
      rating: item.rating,
      year: item.year,
      genre: item.genre,
      overview: item.overview,
      progress_seconds: Math.floor((simulatedProgress / 100) * item.duration_seconds),
      duration_seconds: item.duration_seconds,
    });
    setSelectedItem(item);
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-secondary/15 border border-secondary/15">
              <Play className="h-4 w-4 text-secondary" />
            </div>
            <h2 className="font-display text-xl tracking-[2px] text-foreground">
              Continue Assistindo
            </h2>
          </div>
        </div>

        <div data-horizontal-scroll className="flex gap-3.5 overflow-x-auto scrollbar-hide px-4 pb-2">
          {items.map((item) => {
            const progressPct = item.duration_seconds > 0
              ? Math.min(100, Math.round((item.progress_seconds / item.duration_seconds) * 100))
              : 0;

            return (
              <div
                key={item.id}
                className="shrink-0 w-[200px] group cursor-pointer"
                onClick={() => handleClick(item)}
              >
                <div className="relative rounded-xl overflow-hidden bg-card border border-border/10">
                  {/* Thumb */}
                  <div className="h-[115px] flex items-center justify-center bg-gradient-to-br from-card to-muted/30 relative">
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl opacity-30">🎬</span>
                    )}
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Play className="h-4 w-4 text-primary-foreground fill-current" />
                      </div>
                    </div>
                    {/* Content type badge */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-bold uppercase bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-white/90">
                        {item.content_type === "movie" ? "Filme" : "Série"}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0">
                      <Progress value={progressPct} className="h-[3px] rounded-none bg-muted/30" />
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-1">
                    {item.year && (
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider font-body">
                        {item.year}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground font-body line-clamp-1">
                      {item.title}
                    </p>
                    {item.genre && (
                      <p className="text-[10px] text-muted-foreground/70 line-clamp-1">
                        {item.genre}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ContentDetailSheet
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={
          selectedItem
            ? {
                title: selectedItem.title,
                overview: selectedItem.overview,
                poster_url: selectedItem.poster_url,
                backdrop_url: selectedItem.backdrop_url,
                image_url: selectedItem.poster_url,
                rating: selectedItem.rating,
                year: selectedItem.year,
                genre: selectedItem.genre,
                content_type: selectedItem.content_type === "series" ? "series" : "movie",
              }
            : null
        }
      />
    </>
  );
};

const LoadingSkeleton = () => (
  <section className="space-y-4">
    <div className="flex items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-secondary/15 border border-secondary/15">
          <Play className="h-4 w-4 text-secondary" />
        </div>
        <h2 className="font-display text-xl tracking-[2px] text-foreground">
          Continue Assistindo
        </h2>
      </div>
    </div>
    <div data-horizontal-scroll className="flex gap-3.5 overflow-x-auto scrollbar-hide px-4 pb-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="shrink-0 w-[200px]">
          <div className="rounded-xl overflow-hidden bg-card/50 border border-border/10">
            <div className="h-[115px] skeleton-shimmer" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-16 skeleton-shimmer rounded" />
              <div className="h-4 w-full skeleton-shimmer rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);