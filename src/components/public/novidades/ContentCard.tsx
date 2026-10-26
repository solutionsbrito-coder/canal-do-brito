import { ImageOff, Info, Star } from "lucide-react";
import { BadgePill } from "./BadgePill";
import type { NewsRelease } from "@/hooks/useNewsReleases";

const typeLabel = (t: string) => (t === "movie" ? "🎬 Filme" : t === "series" || t === "tv" ? "📺 Série" : "");

interface ContentCardProps {
  item: NewsRelease;
  onSelect: (item: NewsRelease) => void;
}

export const ContentCard = ({ item, onSelect }: ContentCardProps) => (
  <button
    type="button"
    onClick={() => onSelect(item)}
    className="group text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
  >
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-2 border border-border mb-2 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:border-primary/30">
      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
        <BadgePill type={item.badge_type} size="xs" />
        {(item.content_type === "movie" || item.content_type === "series" || item.content_type === "tv") && (
          <BadgePill type={item.content_type} size="xs" />
        )}
      </div>
      {item.rating != null && item.rating > 0 && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          <span className="text-[10px] font-bold text-white tabular-nums">{item.rating.toFixed(1)}</span>
        </div>
      )}
      {item.image_url ? (
        <img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-8 h-8 text-muted-foreground/20" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
        <span className="w-full flex items-center justify-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-2 rounded-lg text-white text-xs font-bold">
          <Info className="w-3 h-3" /> Ver Detalhes
        </span>
      </div>
    </div>
    <div className="space-y-1 px-0.5">
      <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight font-body">{item.title}</h3>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-body">
        {typeLabel(item.content_type) && <span>{typeLabel(item.content_type)}</span>}
        {item.year && (<><span>•</span><span>{item.year}</span></>)}
      </div>
    </div>
  </button>
);
