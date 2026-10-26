import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { CONTENT_SORT_OPTIONS, type ContentSortMode } from "./contentListUtils";

export interface FilterChipConfig {
  value: string;
  label: string;
  count?: number;
}

interface ContentListFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  sortMode: ContentSortMode;
  onSortChange: (v: ContentSortMode) => void;
  chips: FilterChipConfig[];
  activeChip: string;
  onChipChange: (v: string) => void;
}

/** Busca + ordenação + chips de filtro compartilhados pelas listas de conteúdo do admin. */
export const ContentListFilters = ({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar por título ou gênero...",
  sortMode,
  onSortChange,
  chips,
  activeChip,
  onChipChange,
}: ContentListFiltersProps) => (
  <div className="px-4 pt-3 space-y-2">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="pl-8 pr-9 h-11 text-xs glass-panel border-white/[0.08]"
        aria-label="Buscar nos itens adicionados"
        inputMode="search"
      />
      {search && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>

    <Select value={sortMode} onValueChange={(v) => onSortChange(v as ContentSortMode)}>
      <SelectTrigger className="h-11 text-[11px] glass-panel border-white/[0.08] w-full sm:w-44" aria-label="Ordenar por">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTENT_SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {chips.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChipChange(c.value)}
          aria-pressed={activeChip === c.value}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors min-h-11 ${
            activeChip === c.value
              ? "bg-primary/20 border-primary/40 text-primary"
              : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.18]"
          }`}
        >
          {c.label}{typeof c.count === "number" && c.count > 0 ? ` · ${c.count}` : ""}
        </button>
      ))}
    </div>
  </div>
);
