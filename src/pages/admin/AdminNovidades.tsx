import { useState, useMemo, useEffect } from "react";
import { useTMDBSearch, type TMDBResult } from "@/hooks/useTMDB";
import {
  useAllNewsReleases, useAddNewsRelease, useToggleNewsRelease, useDeleteNewsRelease,
  useUpdateNewsRelease, useReorderNewsReleases, type NewsRelease,
} from "@/hooks/useNewsReleases";
import { useRealtimeNewsReleases } from "@/hooks/useRealtimeContent";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePagination } from "@/hooks/usePagination";
import { ContentListFilters } from "@/components/admin/content/ContentListFilters";
import { ContentListHeader } from "@/components/admin/content/ContentListHeader";
import { ContentPagination } from "@/components/admin/content/ContentPagination";
import { sortContent, usePersistedSort, useContentSelection } from "@/components/admin/content/contentListUtils";
import { Search, Plus, Trash2, Star, ImageOff, Loader2, Sparkles, GripVertical, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { NovidadesStatsBar } from "@/components/admin/NovidadesStatsBar";

const TMDB_IMG = "https://image.tmdb.org/t/p/w780";
const ratingColor = (r: number) => (r >= 7 ? "text-emerald-400" : r >= 5 ? "text-amber-400" : "text-red-400");

type FilterMode = "all" | "movie" | "series" | "inactive" | "no_genre";

const BADGE_OPTIONS = [
  { value: "novidade", label: "🔥 Novidade" },
  { value: "lancamento", label: "🆕 Lançamento" },
  { value: "nova_temporada", label: "📺 Nova Temporada" },
  { value: "estreia", label: "⭐ Estreia" },
  { value: "exclusivo", label: "👑 Exclusivo" },
];

// Run async tasks in chunks of `concurrency`.
async function runInChunks<T>(arr: T[], concurrency: number, worker: (item: T, idx: number) => Promise<void>) {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, arr.length) }, async () => {
    while (i < arr.length) {
      const idx = i++;
      await worker(arr[idx], idx);
    }
  });
  await Promise.all(runners);
}

interface NovidadeRowProps {
  item: NewsRelease;
  refreshing: boolean;
  disabled: boolean;
  selected: boolean;
  selectionMode: boolean;
  dragDisabled: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
  onBadgeChange: (v: string) => void;
  onRefresh: () => void;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
}

const NovidadeRow = ({
  item: m, refreshing, disabled, selected, selectionMode, dragDisabled,
  onSelectChange, onBadgeChange, onRefresh, onToggle, onDelete,
}: NovidadeRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
    disabled: disabled || dragDisabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : ("auto" as const),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg glass-panel p-3 transition-all duration-200 space-y-2 ${selected ? "ring-1 ring-primary/40 bg-primary/[0.04]" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center justify-center h-11 w-7 -ml-1 shrink-0">
          {selectionMode ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectChange(m.id, !!v)}
              disabled={disabled}
              aria-label={`Selecionar ${m.title}`}
            />
          ) : (
            <button
              type="button"
              {...attributes}
              {...listeners}
              disabled={disabled || dragDisabled}
              className="touch-none h-11 w-7 flex items-center justify-center text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={dragDisabled ? "Reordenar indisponível com filtros ativos" : `Arrastar para reordenar ${m.title}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
        </div>

        {m.image_url ? (
          <img src={m.image_url} alt={m.title} className="h-16 w-12 rounded-md object-cover shrink-0" loading="lazy" />
        ) : (
          <div className="h-16 w-12 rounded-md bg-white/[0.03] flex items-center justify-center shrink-0">
            <ImageOff className="h-3.5 w-3.5 text-muted-foreground/20" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{m.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`rounded px-1.5 py-0.5 font-bold text-white text-[10px] ${m.content_type === "movie" ? "bg-emerald-500/80" : "bg-blue-500/80"}`}>
              {m.content_type === "movie" ? "🎬 Filme" : "📺 Série"}
            </span>
            <Select value={m.badge_type} onValueChange={onBadgeChange} disabled={disabled}>
              <SelectTrigger className="h-9 w-auto min-w-[120px] text-[11px] font-bold border-white/[0.1] bg-white/[0.03] px-2 py-0 gap-1" aria-label={`Badge de ${m.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {m.year && <span className="text-[11px] text-muted-foreground/70">{m.year}</span>}
            {m.rating != null && m.rating > 0 && (
              <span className={`flex items-center gap-0.5 text-[11px] font-bold ${ratingColor(m.rating)}`}>
                <Star className="h-2.5 w-2.5 fill-current" />
                {m.rating.toFixed(1)}
              </span>
            )}
          </div>
          {m.genres ? (
            <p className="text-[11px] text-muted-foreground/60 mt-1 truncate">{m.genres}</p>
          ) : (
            <p className="text-[11px] text-amber-400/80 italic mt-1">sem gênero</p>
          )}
          {(m.runtime || m.seasons) && (
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}min` : ""}
              {m.runtime && m.seasons ? " · " : ""}
              {m.seasons ? `${m.seasons} temporada${m.seasons > 1 ? "s" : ""}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-md text-muted-foreground hover:text-amber-400"
          disabled={refreshing || disabled}
          onClick={onRefresh}
          aria-label={`Atualizar dados de ${m.title}`}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer min-h-11 px-1">
            <span className="text-[11px] text-muted-foreground">{m.active ? "Ativo" : "Inativo"}</span>
            <Switch
              checked={m.active}
              disabled={disabled}
              onCheckedChange={onToggle}
              aria-label={`${m.active ? "Desativar" : "Ativar"} ${m.title}`}
            />
          </label>
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-md text-destructive hover:bg-destructive/10"
            disabled={disabled}
            onClick={onDelete}
            aria-label={`Remover ${m.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdminNovidades = () => {
  const { user } = useAuth();
  const { results, loading: searching, search, setResults, fetchDetails } = useTMDBSearch();
  const { data: items, isLoading } = useAllNewsReleases();
  useRealtimeNewsReleases();
  const addItem = useAddNewsRelease();
  const toggleItem = useToggleNewsRelease();
  const updateItem = useUpdateNewsRelease();
  const deleteItem = useDeleteNewsRelease();
  const reorderItems = useReorderNewsReleases();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchType, setSearchType] = useState<"movie" | "series">("movie");
  const [badgeType, setBadgeType] = useState<string>(() => {
    if (typeof window === "undefined") return "novidade";
    return localStorage.getItem("admin:lastBadgeType") || "novidade";
  });
  const [addingId, setAddingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const { sortMode, setSortMode } = usePersistedSort("admin:novidadesSort");
  const [listSearch, setListSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NewsRelease | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const selection = useContentSelection();

  const all = items ?? [];
  const busy = !!batchProgress || bulkRunning;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(listSearch.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [listSearch]);

  const handleBadgeTypeChange = (v: string) => {
    setBadgeType(v);
    try { localStorage.setItem("admin:lastBadgeType", v); } catch { /* ignore */ }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    search(searchType === "movie" ? "search_movie" : "search_tv", query);
  };
  const clearQuery = () => { setQuery(""); setResults([]); setSearched(false); };

  const handleAdd = async (r: TMDBResult) => {
    const existing = all.find((m) => m.tmdb_id === r.id && m.content_type === searchType);
    if (existing) { toast.info("Item já adicionado"); return; }
    setAddingId(r.id);
    try {
      const action = searchType === "movie" ? "movie_details" : "tv_details";
      const details = await fetchDetails(action, r.id);
      const genreText = details?.genres?.map((g) => g.name).join(", ") || null;
      const backdropUrl = (details as any)?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${(details as any).backdrop_path}` : null;
      await addItem.mutateAsync({
        tmdb_id: r.id, title: r.title || r.name || "",
        content_type: searchType, badge_type: badgeType,
        image_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
        backdrop_url: backdropUrl,
        overview: r.overview || null,
        rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
        year: (r.release_date || r.first_air_date) ? parseInt(r.release_date || r.first_air_date || "") : null,
        display_order: all.length,
        added_by: user?.id || null,
        genres: genreText,
        runtime: searchType === "movie" ? ((details as any)?.runtime || null) : null,
        seasons: searchType === "series" ? ((details as any)?.number_of_seasons || null) : null,
        tagline: (details as any)?.tagline || null,
      });
      toast.success("Item adicionado com detalhes!");
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (err?.code === "23505" || /duplicate|unique/i.test(msg)) {
        toast.info("Item já adicionado");
      } else {
        toast.error(msg);
      }
    }
    setAddingId(null);
  };

  const handleRefreshOne = async (item: NewsRelease) => {
    if (!item.tmdb_id) return;
    setRefreshingId(item.id);
    try {
      const action = item.content_type === "movie" ? "movie_details" : "tv_details";
      const details = await fetchDetails(action as "movie_details" | "tv_details", item.tmdb_id);
      if (!details) { toast.error("Não foi possível buscar detalhes"); return; }
      const genreText = details.genres?.map((g) => g.name).join(", ") || null;
      const backdropUrl = (details as any)?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${(details as any).backdrop_path}` : null;
      await updateItem.mutateAsync({
        id: item.id,
        genres: genreText,
        rating: (details as any).vote_average ? Math.round((details as any).vote_average * 10) / 10 : item.rating,
        overview: (details as any).overview || item.overview,
        runtime: item.content_type === "movie" ? ((details as any).runtime || item.runtime) : item.runtime,
        seasons: item.content_type === "series" ? ((details as any).number_of_seasons || item.seasons) : item.seasons,
        tagline: (details as any).tagline || item.tagline,
        backdrop_url: backdropUrl || item.backdrop_url,
      });
      toast.success(`"${item.title}" atualizado!`);
    } catch (err: any) { toast.error(err.message); }
    finally { setRefreshingId(null); }
  };

  const runBatch = async (list: NewsRelease[]) => {
    if (list.length === 0) return;
    setBatchProgress({ current: 0, total: list.length });
    let updated = 0;
    let done = 0;
    await runInChunks(list, 3, async (m) => {
      try {
        if (!m.tmdb_id) return;
        const action = m.content_type === "movie" ? "movie_details" : "tv_details";
        const details = await fetchDetails(action as "movie_details" | "tv_details", m.tmdb_id);
        if (details) {
          const genreText = details.genres?.map((g) => g.name).join(", ") || null;
          const backdropUrl = (details as any)?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${(details as any).backdrop_path}` : null;
          await updateItem.mutateAsync({
            id: m.id,
            genres: genreText,
            rating: (details as any).vote_average ? Math.round((details as any).vote_average * 10) / 10 : m.rating,
            overview: (details as any).overview || m.overview,
            backdrop_url: backdropUrl || m.backdrop_url,
          });
          updated++;
        }
      } catch { /* continue */ }
      finally {
        done++;
        setBatchProgress({ current: done, total: list.length });
      }
    });
    setBatchProgress(null);
    toast.success(`${updated} de ${list.length} itens atualizados!`);
  };

  const filteredItems = useMemo(() => {
    const filtered = all.filter((m) => {
      if (filter === "movie" && m.content_type !== "movie") return false;
      if (filter === "series" && m.content_type !== "series" && m.content_type !== "tv") return false;
      if (filter === "inactive" && m.active) return false;
      if (filter === "no_genre" && m.genres) return false;
      if (debouncedSearch) {
        const hay = `${m.title} ${m.genres || ""}`.toLowerCase();
        if (!hay.includes(debouncedSearch)) return false;
      }
      return true;
    });
    return sortContent(filtered, sortMode);
  }, [all, filter, debouncedSearch, sortMode]);

  const isFiltering = filter !== "all" || debouncedSearch !== "" || sortMode !== "manual";
  const pagination = usePagination({ total: filteredItems.length, pageSize: 20 });
  const paginated = filteredItems.slice(pagination.start, pagination.end);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isFiltering) return;
    const oldIndex = all.findIndex((m) => m.id === active.id);
    const newIndex = all.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(all, oldIndex, newIndex);
    reorderItems.mutate(newOrder.map((m) => m.id), {
      onError: (e: any) => toast.error(e?.message || "Falha ao salvar ordem"),
      onSuccess: () => toast.success("Ordem atualizada"),
    });
  };

  const bulkSetActive = async (active: boolean) => {
    if (selection.selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selection.selectedIds);
    const { error } = await supabase.from("news_releases").update({ active }).in("id", ids);
    setBulkRunning(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["news_releases"] });
    toast.success(`${ids.length} item(ns) ${active ? "ativado(s)" : "desativado(s)"}`);
    selection.exitSelection();
  };

  const bulkDelete = async () => {
    if (selection.selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selection.selectedIds);
    const { error } = await supabase.from("news_releases").delete().in("id", ids);
    setBulkRunning(false);
    setConfirmBulkDelete(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["news_releases"] });
    toast.success(`${ids.length} item(ns) removido(s)`);
    selection.exitSelection();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const missingGenreCount = all.filter((m) => !m.genres).length;

  return (
    <div className="space-y-5">
      {all.length > 0 && <NovidadesStatsBar items={all} />}

      {/* Search TMDB */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Buscar Conteúdo
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={searchType} onValueChange={(v) => { setSearchType(v as any); setResults([]); setSearched(false); }}>
              <SelectTrigger className="glass-panel border-white/[0.1] h-11 text-xs" aria-label="Tipo de conteúdo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">🎬 Filme</SelectItem>
                <SelectItem value="series">📺 Série</SelectItem>
              </SelectContent>
            </Select>
            <Select value={badgeType} onValueChange={handleBadgeTypeChange}>
              <SelectTrigger className="glass-panel border-white/[0.1] h-11 text-xs" aria-label="Tipo de badge"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="tmdb-search-input"
                aria-label="Buscar título no TMDB"
                placeholder={searchType === "movie" ? "Nome do filme..." : "Nome da série..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="glass-panel border-white/[0.1] text-sm h-11 pr-9"
                                enterKeyHint="search"
                inputMode="search"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05] flex items-center justify-center"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()} size="icon" className="shrink-0 h-11 w-11" aria-label="Buscar">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {searching && <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" />Buscando...</div>}

          {!searching && searched && results.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">Nenhum resultado encontrado</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {results.map((r) => {
                const already = all.some((m) => m.tmdb_id === r.id && m.content_type === searchType);
                return (
                  <div key={r.id} className="relative rounded-lg glass-panel overflow-hidden group">
                    {r.poster_path ? (
                      <img src={`${TMDB_IMG}${r.poster_path}`} alt={r.title || r.name} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-[2/3] flex items-center justify-center bg-white/[0.02]"><ImageOff className="h-6 w-6 text-muted-foreground/20" /></div>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <Star className={`h-2.5 w-2.5 fill-current ${ratingColor(r.vote_average || 0)}`} />
                      <span className="text-[10px] font-bold tabular-nums">{r.vote_average?.toFixed(1)}</span>
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-semibold truncate">{r.title || r.name}</p>
                    </div>
                    <Button
                      size="sm"
                      className="absolute bottom-1.5 right-1.5 h-9 px-2.5 rounded-full text-[10px] shadow-lg"
                      onClick={() => handleAdd(r)}
                      disabled={addingId === r.id || already}
                      aria-label={already ? `${r.title || r.name} já adicionado` : `Adicionar ${r.title || r.name}`}
                    >
                      {addingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : already ? "✓" : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <ContentListHeader
          title="Adicionados"
          selectionMode={selection.selectionMode}
          selectedCount={selection.selectedIds.size}
          totalCount={all.length}
          incompleteCount={missingGenreCount}
          incompleteLabel="sem gênero"
          busy={busy}
          bulkRunning={bulkRunning}
          batchProgress={batchProgress}
          accentClass="text-amber-400"
          onBatchIncomplete={() => missingGenreCount ? runBatch(all.filter((m) => !m.genres)) : toast.info("Todos os itens já têm gênero")}
          onBatchAll={() => runBatch(all)}
          onEnterSelection={selection.enterSelection}
          onExitSelection={selection.exitSelection}
          onSelectAll={() => selection.selectAll(filteredItems.map((m) => m.id))}
          onClearSelection={selection.clearSelection}
          onBulkActive={bulkSetActive}
          onBulkDelete={() => setConfirmBulkDelete(true)}
        />

        {all.length > 0 && (
          <ContentListFilters
            search={listSearch}
            onSearchChange={(v) => { setListSearch(v); pagination.goToPage(1); }}
            sortMode={sortMode}
            onSortChange={(v) => { setSortMode(v); pagination.goToPage(1); }}
            chips={[
              { value: "all", label: "Todos", count: all.length },
              { value: "movie", label: "🎬 Filmes", count: all.filter((i) => i.content_type === "movie").length },
              { value: "series", label: "📺 Séries", count: all.filter((i) => i.content_type === "series" || i.content_type === "tv").length },
              { value: "inactive", label: "Inativos", count: all.filter((i) => !i.active).length },
              { value: "no_genre", label: "Sem gênero", count: missingGenreCount },
            ]}
            activeChip={filter}
            onChipChange={(v) => { setFilter(v as FilterMode); pagination.goToPage(1); }}
          />
        )}

        <div className="p-4">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg shimmer-skeleton bg-white/[0.02]" />
              ))}
            </div>
          ) : all.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhuma novidade adicionada.</p>
              <p className="text-[10px] text-muted-foreground/50">Busque um filme ou série e adicione como novidade.</p>
              <Button size="sm" variant="outline" className="min-h-11 text-xs gap-1" onClick={() => document.getElementById("tmdb-search-input")?.focus()}>
                <Search className="h-3.5 w-3.5" /> Adicionar novidade
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhum item corresponde aos filtros</p>
              <Button size="sm" variant="outline" className="text-[10px]" onClick={() => { setListSearch(""); setFilter("all"); }}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <>
              {isFiltering && (
                <p className="text-[10px] text-muted-foreground/60 mb-2">
                  Reordenação por arrastar fica disponível na ordem manual sem filtros.
                </p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={paginated.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {paginated.map((m) => (
                      <NovidadeRow
                        key={m.id}
                        item={m}
                        refreshing={refreshingId === m.id}
                        disabled={busy}
                        selected={selection.selectedIds.has(m.id)}
                        selectionMode={selection.selectionMode}
                        dragDisabled={isFiltering}
                        onSelectChange={selection.toggleSelect}
                        onBadgeChange={(v) => updateItem.mutate({ id: m.id, badge_type: v })}
                        onRefresh={() => handleRefreshOne(m)}
                        onToggle={(v) => toggleItem.mutate({ id: m.id, active: v })}
                        onDelete={() => setDeleteTarget(m)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {filteredItems.length > 20 && (
            <ContentPagination
              page={pagination.page}
              pageNumbers={pagination.pageNumbers}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={pagination.prevPage}
              onNext={pagination.nextPage}
              onGoTo={pagination.goToPage}
              start={pagination.start}
              end={pagination.end}
              total={filteredItems.length}
              noun={["item", "itens"]}
            />
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente "{deleteTarget?.title}" das novidades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDelete} onOpenChange={(o) => !o && !bulkRunning && setConfirmBulkDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {selection.selectedIds.size} item(ns)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os itens selecionados serão removidos permanentemente das novidades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} disabled={bulkRunning} className="bg-destructive hover:bg-destructive/90">
              {bulkRunning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNovidades;
