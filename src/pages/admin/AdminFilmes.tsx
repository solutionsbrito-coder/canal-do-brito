import { useMemo, useState } from "react";
import { useTMDBSearch, type TMDBResult } from "@/hooks/useTMDB";
import { useAllMovies, useAddMovie, useToggleMovie, useDeleteMovie, useUpdateMovie, useReorderMovies, type FeaturedMovie } from "@/hooks/useMovies";
import { useRealtimeMovies } from "@/hooks/useRealtimeMovies";
import { usePagination } from "@/hooks/usePagination";
import { ContentListFilters } from "@/components/admin/content/ContentListFilters";
import { SortableContentRow } from "@/components/admin/content/SortableContentRow";
import { sortContent, usePersistedSort } from "@/components/admin/content/contentListUtils";

import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Trash2, Star, ImageOff, Loader2, Film, RefreshCw, X, Check } from "lucide-react";
import { toast } from "sonner";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w780";
const ratingColor = (r: number) => r >= 7 ? "text-emerald-400" : r >= 5 ? "text-amber-400" : "text-red-400";

const AdminFilmes = () => {
  const { user } = useAuth();
  const { results, loading: searching, search, setResults, fetchDetails } = useTMDBSearch();
  const { data: movies, isLoading } = useAllMovies();
  useRealtimeMovies();
  const addMovie = useAddMovie();
  const toggleMovie = useToggleMovie();
  const deleteMovie = useDeleteMovie();
  const updateMovie = useUpdateMovie();
  const reorderMovies = useReorderMovies();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"search" | "trending">("search");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FeaturedMovie | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBulkDeactivate, setConfirmBulkDeactivate] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "incomplete">("all");
  const { sortMode, setSortMode } = usePersistedSort("admin:filmes:sort");
  const qc = useQueryClient();

  const batchActive = !!batchProgress || bulkRunning;
  const allMovies = movies ?? [];

  const filteredMovies = useMemo(() => {
    const term = listSearch.trim().toLocaleLowerCase("pt-BR");
    const byStatus = allMovies.filter((m) => {
      if (statusFilter === "active") return m.active;
      if (statusFilter === "inactive") return !m.active;
      if (statusFilter === "incomplete") return !m.genre || !m.backdrop_url;
      return true;
    });
    const bySearch = term
      ? byStatus.filter(
          (m) =>
            m.title.toLocaleLowerCase("pt-BR").includes(term) ||
            (m.genre || "").toLocaleLowerCase("pt-BR").includes(term)
        )
      : byStatus;
    return sortContent(bySearch, sortMode);
  }, [allMovies, listSearch, statusFilter, sortMode]);

  const isFiltering = listSearch.trim() !== "" || statusFilter !== "all" || sortMode !== "manual";
  const pagination = usePagination({ total: filteredMovies.length, pageSize: 20 });
  const paginatedMovies = filteredMovies.slice(pagination.start, pagination.end);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !movies || isFiltering) return;
    const oldIndex = movies.findIndex((m) => m.id === active.id);
    const newIndex = movies.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(movies, oldIndex, newIndex);

    reorderMovies.mutate(newOrder.map((m) => m.id), {
      onError: (e: any) => toast.error(e?.message || "Falha ao salvar ordem"),
      onSuccess: () => toast.success("Ordem atualizada"),
    });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const enterSelection = () => { setSelectionMode(true); setSelectedIds(new Set()); };
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const selectAllVisible = () => setSelectedIds(new Set(filteredMovies.map((m) => m.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("featured_movies").update({ active }).in("id", ids);
    setBulkRunning(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["featured_movies"] });
    toast.success(`${ids.length} filme(s) ${active ? "ativado(s)" : "desativado(s)"}`);
    exitSelection();
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("featured_movies").delete().in("id", ids);
    setBulkRunning(false);
    setConfirmBulkDelete(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["featured_movies"] });
    toast.success(`${ids.length} filme(s) removido(s)`);
    exitSelection();
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    search("search_movie", query.trim());
  };
  const loadNowPlaying = () => { setTab("trending"); setResults([]); setSearched(true); search("now_playing"); };
  const switchToSearch = () => { setTab("search"); setResults([]); setSearched(false); };
  const clearQuery = () => { setQuery(""); setResults([]); setSearched(false); };

  const handleAdd = async (r: TMDBResult) => {
    const existing = movies?.find((m) => m.tmdb_id === r.id);
    if (existing) { toast.info("Filme já adicionado"); return; }
    setAddingId(r.id);
    try {
      const details = await fetchDetails("movie_details", r.id);
      const genreText = details?.genres?.map((g) => g.name).join(", ") || null;
      await addMovie.mutateAsync({
        tmdb_id: r.id, title: r.title || r.name || "",
        poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
        backdrop_url: (r as any).backdrop_path ? `${TMDB_BACKDROP}${(r as any).backdrop_path}` : null,
        overview: r.overview || null,
        rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
        year: r.release_date ? parseInt(r.release_date) : null,
        genre: genreText, added_by: user?.id || null,
      });
      toast.success("Filme adicionado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setAddingId(null); }
  };

  const handleRefreshOne = async (movie: FeaturedMovie) => {
    if (!movie) return;
    setRefreshingId(movie.id);
    try {
      const details = await fetchDetails("movie_details", movie.tmdb_id);
      if (!details) { toast.error("Não foi possível buscar detalhes"); return; }
      const genreText = details.genres?.map((g) => g.name).join(", ") || null;
      await updateMovie.mutateAsync({
        id: movie.id,
        genre: genreText,
        rating: (details as any).vote_average ? Math.round((details as any).vote_average * 10) / 10 : movie.rating,
        overview: (details as any).overview || movie.overview,
        backdrop_url: (details as any).backdrop_path ? `${TMDB_BACKDROP}${(details as any).backdrop_path}` : movie.backdrop_url,
      });
      toast.success(`"${movie.title}" atualizado!`);
    } catch (err: any) { toast.error(err.message); }
    finally { setRefreshingId(null); }
  };

  const runBatch = async (list: NonNullable<typeof movies>, label: string) => {
    setBatchProgress({ current: 0, total: list.length });
    let updated = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      setBatchProgress({ current: i + 1, total: list.length });
      try {
        const details = await fetchDetails("movie_details", m.tmdb_id);
        if (details) {
          const genreText = details.genres?.map((g) => g.name).join(", ") || null;
          await updateMovie.mutateAsync({
            id: m.id,
            genre: genreText,
            rating: (details as any).vote_average ? Math.round((details as any).vote_average * 10) / 10 : m.rating,
            overview: (details as any).overview || m.overview,
            backdrop_url: (details as any).backdrop_path ? `${TMDB_BACKDROP}${(details as any).backdrop_path}` : m.backdrop_url,
          });
          updated++;
        }
      } catch { /* continue */ }
    }
    setBatchProgress(null);
    toast.success(`${updated} de ${list.length} ${label} atualizados!`);
  };

  const handleBatchUpdate = async () => {
    if (!movies || movies.length === 0) return;
    const needsUpdate = movies.filter((m) => !m.genre || !m.backdrop_url);
    if (needsUpdate.length === 0) { toast.info("Todos os filmes já estão completos"); return; }
    await runBatch(needsUpdate, "filmes incompletos");
  };

  const handleBatchUpdateAll = async () => {
    if (!movies || movies.length === 0) return;
    await runBatch(movies, "filmes");
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMovie.mutate(pendingDelete.id);
    setPendingDelete(null);
  };

  const activeCount = movies?.filter((m) => m.active).length || 0;
  const totalCount = movies?.length || 0;
  const missingDataCount = movies?.filter((m) => !m.genre || !m.backdrop_url).length || 0;
  const ratedCount = movies?.filter((m) => m.rating != null).length || 0;
  const avgRating = ratedCount
    ? (movies!.reduce((s, m) => s + (m.rating || 0), 0) / ratedCount)
    : 0;

  return (
    <div className="space-y-5">
      {/* Stats compactos */}
      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold">Total</p>
            <p className="text-lg font-extrabold text-foreground tabular-nums mt-0.5">{totalCount}</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold">Ativos</p>
            <p className="text-lg font-extrabold text-blue-400 tabular-nums mt-0.5">{activeCount}</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold">Nota média</p>
            <p className={`text-lg font-extrabold tabular-nums mt-0.5 ${avgRating ? ratingColor(avgRating) : "text-muted-foreground/40"}`}>
              {avgRating ? avgRating.toFixed(1) : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Film className="h-4 w-4 text-blue-400" />
            Buscar Filmes
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div role="tablist" aria-label="Modo de busca" className="flex gap-1.5">
            {[
              { key: "search" as const, label: "Buscar", onClick: switchToSearch },
              { key: "trending" as const, label: "Em cartaz", onClick: loadNowPlaying },
            ].map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={t.onClick}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all min-h-[44px] flex-1 sm:flex-initial ${tab === t.key ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "glass-panel text-muted-foreground/70"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "search" ? (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="tmdb-search-input"
                aria-label="Buscar filme no TMDB"
                placeholder="Nome do filme..."
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
          ) : (
            <p className="text-[11px] text-muted-foreground/60 italic px-1">Mostrando filmes em cartaz no momento — clique em "Buscar" para voltar.</p>
          )}

          {searching && <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" />Buscando...</div>}

          {!searching && searched && results.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">Nenhum resultado encontrado</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {results.map((r) => {
                const alreadyAdded = movies?.some((m) => m.tmdb_id === r.id);
                return (
                  <div key={r.id} className="relative rounded-lg glass-panel overflow-hidden group">
                    {r.poster_path ? (
                      <img src={`${TMDB_IMG}${r.poster_path}`} alt={r.title || r.name} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-[2/3] flex items-center justify-center bg-white/[0.02]"><ImageOff className="h-6 w-6 text-muted-foreground/20" /></div>
                    )}
                    {alreadyAdded && (
                      <div className="absolute top-1 right-1 px-1 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center" aria-label="Já adicionado">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-[10px] font-semibold truncate">{r.title || r.name}</p>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                        <Star className={`h-2 w-2 fill-current ${ratingColor(r.vote_average || 0)}`} />
                        <span>{r.vote_average?.toFixed(1)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={addingId === r.id || alreadyAdded}
                      className="absolute bottom-0 left-0 right-0 rounded-none h-9 text-[10px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity"
                      onClick={() => handleAdd(r)}
                      aria-label={`Adicionar ${r.title || r.name} ao catálogo`}
                    >
                      {addingId === r.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {alreadyAdded ? "Adicionado" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-foreground">
            Adicionados {selectionMode && selectedIds.size > 0 && (
              <span className="text-blue-400 font-normal">· {selectedIds.size} selecionado(s)</span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {!selectionMode ? (
              <>
                {missingDataCount > 0 && (
                  <Button size="sm" variant="outline" onClick={handleBatchUpdate} disabled={batchActive} className="h-9 text-[10px] gap-1">
                    {batchActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {missingDataCount} incompletos
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleBatchUpdateAll} disabled={batchActive || totalCount === 0} className="h-9 text-[10px] gap-1">
                  {batchActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Atualizar todos
                </Button>
                <Button size="sm" variant="outline" onClick={enterSelection} disabled={batchActive || totalCount === 0} className="h-9 text-[10px] gap-1">
                  <Check className="h-3 w-3" />
                  Selecionar
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={selectAllVisible} disabled={bulkRunning} className="h-9 text-[10px]">
                  Todos
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} disabled={bulkRunning || selectedIds.size === 0} className="h-9 text-[10px]">
                  Limpar
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)} disabled={bulkRunning || selectedIds.size === 0} className="h-9 text-[10px] gap-1">
                  {bulkRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Ativar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmBulkDeactivate(true)} disabled={bulkRunning || selectedIds.size === 0} className="h-9 text-[10px] gap-1">
                  {bulkRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Desativar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)} disabled={bulkRunning || selectedIds.size === 0} className="h-9 text-[10px] gap-1">
                  <Trash2 className="h-3 w-3" />
                  Remover
                </Button>
                <Button size="sm" variant="ghost" onClick={exitSelection} disabled={bulkRunning} className="h-9 text-[10px]" aria-label="Sair do modo de seleção">
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {batchProgress && (
          <div className="px-4 pt-3 space-y-1" role="status" aria-live="polite">
            <p className="text-[10px] text-muted-foreground">Atualizando {batchProgress.current}/{batchProgress.total}...</p>
            <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-1.5" />
          </div>
        )}

        {totalCount > 0 && (
          <ContentListFilters
            search={listSearch}
            onSearchChange={(v) => { setListSearch(v); pagination.goToPage(1); }}
            sortMode={sortMode}
            onSortChange={(v) => { setSortMode(v); pagination.goToPage(1); }}
            chips={[
              { value: "all", label: "Todos", count: totalCount },
              { value: "active", label: "Ativos", count: activeCount },
              { value: "inactive", label: "Inativos", count: totalCount - activeCount },
              { value: "incomplete", label: "Incompletos", count: missingDataCount },
            ]}
            activeChip={statusFilter}
            onChipChange={(v) => { setStatusFilter(v as typeof statusFilter); pagination.goToPage(1); }}
          />
        )}

        <div className="p-4">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg glass-panel p-3 shimmer-skeleton">
                  <div className="h-14 w-10 rounded-md bg-white/[0.04]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 bg-white/[0.04] rounded" />
                    <div className="h-2 w-1/3 bg-white/[0.04] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : totalCount === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Film className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhum filme adicionado.</p>
              <p className="text-[10px] text-muted-foreground/50">Busque um título e adicione ao catálogo.</p>
              <Button size="sm" variant="outline" className="min-h-11 text-xs gap-1" onClick={() => document.getElementById("tmdb-search-input")?.focus()}>
                <Search className="h-3.5 w-3.5" /> Buscar filme
              </Button>
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhum filme encontrado com esses filtros</p>
              <Button size="sm" variant="outline" className="text-[10px]" onClick={() => { setListSearch(""); setStatusFilter("all"); }}>
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
                <SortableContext items={paginatedMovies.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {paginatedMovies.map((m) => (
                      <SortableContentRow
                        key={m.id}
                        item={m}
                        refreshing={refreshingId === m.id}
                        disabled={batchActive}
                        selected={selectedIds.has(m.id)}
                        selectionMode={selectionMode}
                        dragDisabled={isFiltering}
                        onSelectChange={toggleSelect}
                        onRefresh={() => handleRefreshOne(m)}
                        onToggle={(v) => toggleMovie.mutate({ id: m.id, active: v })}
                        onDelete={() => setPendingDelete(m)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {filteredMovies.length > 20 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={pagination.hasPrev ? pagination.prevPage : undefined}
                      className={!pagination.hasPrev ? "pointer-events-none opacity-40" : "cursor-pointer"}
                      href="#"
                    />
                  </PaginationItem>
                  {pagination.pageNumbers.map((p, i) =>
                    p === -1 ? (
                      <PaginationItem key={`e-${i}`}>
                        <span className="flex h-9 w-9 items-center justify-center text-[10px] text-muted-foreground">…</span>
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === pagination.page}
                          onClick={() => pagination.goToPage(p)}
                          href="#"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={pagination.hasNext ? pagination.nextPage : undefined}
                      className={!pagination.hasNext ? "pointer-events-none opacity-40" : "cursor-pointer"}
                      href="#"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
                {pagination.start + 1}–{pagination.end} de {filteredMovies.length} filme{filteredMovies.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover filme?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title ? `"${pendingDelete.title}" será removido permanentemente do catálogo.` : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDeactivate} onOpenChange={setConfirmBulkDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {selectedIds.size} filme(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os filmes selecionados deixam de aparecer no site público. Você pode reativá-los depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmBulkDeactivate(false); bulkSetActive(false); }}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDelete} onOpenChange={(o) => !o && !bulkRunning && setConfirmBulkDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {selectedIds.size} filme(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os filmes selecionados serão removidos permanentemente do catálogo.
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

export default AdminFilmes;
