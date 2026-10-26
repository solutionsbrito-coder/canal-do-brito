import { Button } from "@/components/ui/button";
import { ImageOff, Loader2, Plus, Star, Check } from "lucide-react";
import type { TMDBResult } from "@/hooks/useTMDB";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const ratingColor = (r: number) => (r >= 7 ? "text-emerald-400" : r >= 5 ? "text-amber-400" : "text-red-400");

interface TMDBSearchGridProps {
  results: TMDBResult[];
  addingId: number | null;
  isAdded: (r: TMDBResult) => boolean;
  onAdd: (r: TMDBResult) => void;
  /** Rótulo do botão quando o item já existe (ex.: "Adicionado" / "Adicionada"). */
  addedLabel?: string;
}

/** Grade compartilhada de resultados do TMDB usada em Filmes, Séries e Novidades. */
export const TMDBSearchGrid = ({ results, addingId, isAdded, onAdd, addedLabel = "Adicionado" }: TMDBSearchGridProps) => {
  if (results.length === 0) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {results.map((r) => {
        const already = isAdded(r);
        const label = r.title || r.name || "";
        return (
          <div key={r.id} className="relative rounded-lg glass-panel overflow-hidden group">
            {r.poster_path ? (
              <img src={`${TMDB_IMG}${r.poster_path}`} alt={label} className="w-full aspect-[2/3] object-cover" loading="lazy" />
            ) : (
              <div className="w-full aspect-[2/3] flex items-center justify-center bg-white/[0.02]">
                <ImageOff className="h-6 w-6 text-muted-foreground/20" />
              </div>
            )}
            {already && (
              <div
                className="absolute top-1 right-1 px-1 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center"
                aria-label="Já adicionado"
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </div>
            )}
            <div className="p-2">
              <p className="text-[10px] font-semibold truncate">{label}</p>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                <Star className={`h-2 w-2 fill-current ${ratingColor(r.vote_average || 0)}`} />
                <span>{r.vote_average?.toFixed(1)}</span>
              </div>
            </div>
            <Button
              size="sm"
              disabled={addingId === r.id || already}
              className="absolute bottom-0 left-0 right-0 rounded-none h-9 text-[10px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity"
              onClick={() => onAdd(r)}
              aria-label={already ? `${label} já adicionado` : `Adicionar ${label} ao catálogo`}
            >
              {addingId === r.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
              {already ? addedLabel : "Add"}
            </Button>
          </div>
        );
      })}
    </div>
  );
};
