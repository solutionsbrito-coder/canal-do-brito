import { useState } from "react";
import { useActiveSeries, type FeaturedSeries } from "@/hooks/useSeries";
import { Skeleton } from "@/components/ui/skeleton";
import { Clapperboard, Star, ImageOff, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { ContentDetailSheet } from "./ContentDetailSheet";

const SeriesCard = ({ series, index, onClick }: { series: FeaturedSeries; index: number; onClick: () => void }) => {
  const [imgErr, setImgErr] = useState(false);
  const [backdropErr, setBackdropErr] = useState(false);
  const hasBackdrop = series.backdrop_url && !backdropErr;
  const hasPoster = series.poster_url && !imgErr;

  return (
    <motion.div
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/20 bg-card premium-shadow-sm aspect-[2/3] transition-all duration-300 group-hover:scale-[1.03] group-hover:premium-shadow group-hover:border-primary/20">
        {/* Backdrop cinematic layer */}
        {hasBackdrop && (
          <img
            src={series.backdrop_url!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] opacity-30 transition-opacity duration-500 group-hover:opacity-50 group-hover:blur-[1px]"
            loading="lazy"
            onError={() => setBackdropErr(true)}
          />
        )}
        {hasPoster ? (
          <img src={series.poster_url!} alt={series.title} className="relative w-full h-full object-cover" loading="lazy" onError={() => setImgErr(true)} />
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-secondary/50 gap-2">
            <ImageOff className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 sm:block hidden" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        {series.rating && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-amber-500/90 backdrop-blur-sm px-2 py-1 shadow-md">
            <Star className="h-3 w-3 text-white fill-white" />
            <span className="text-[11px] font-bold text-white">{Number(series.rating).toFixed(1)}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 space-y-1.5">
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2 drop-shadow-lg">{series.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {series.year && <span className="text-[11px] text-foreground/50 font-medium">{series.year}</span>}
            {series.genre && (
              <span className="text-[10px] text-primary font-semibold bg-primary/15 rounded-full px-2 py-0.5 border border-primary/20">
                {series.genre.split(",")[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const SeriesSection = () => {
  const { data: series, isLoading } = useActiveSeries();
  const [selectedSeries, setSelectedSeries] = useState<FeaturedSeries | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-5" id="series">
        <SectionHeader />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!series || series.length === 0) {
    return (
      <div className="space-y-5" id="series">
        <SectionHeader />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-secondary/50 p-5 mb-4 border border-border/20">
            <Clapperboard className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma série em destaque</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" id="series">
      <SectionHeader count={series.length} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        {series.map((s, idx) => (
          <SeriesCard key={s.id} series={s} index={idx} onClick={() => setSelectedSeries(s)} />
        ))}
      </div>
      <ContentDetailSheet
        open={!!selectedSeries}
        onClose={() => setSelectedSeries(null)}
        item={selectedSeries ? { ...selectedSeries, content_type: "series" } : null}
      />
    </div>
  );
};

const SectionHeader = ({ count }: { count?: number }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
        <Clapperboard className="h-4.5 w-4.5 text-primary" />
      </div>
      <h2 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight">Séries em Destaque</h2>
    </div>
    {count !== undefined && (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 bg-secondary/50 rounded-full px-3 py-1 border border-border/20">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="font-semibold">{count}</span>
      </div>
    )}
  </div>
);
