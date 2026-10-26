import { useMemo, useState } from "react";
import { useTMDBSearch, type TMDBResult } from "@/hooks/useTMDB";
import {
  useAllSeries, useAddSeries, useToggleSeries, useDeleteSeries, useUpdateSeries,
  useReorderSeries, type FeaturedSeries,
} from "@/hooks/useSeries";
import { useRealtimeSeries } from "@/hooks/useRealtimeContent";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePagination } from "@/hooks/usePagination";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ContentListFilters } from "@/components/admin/content/ContentListFilters";
import { ContentListHeader } from "@/components/admin/content/ContentListHeader";
import { ContentPagination } from "@/components/admin/content/ContentPagination";
import { SortableContentRow } from "@/components/admin/content/SortableContentRow";
import { TMDBSearchGrid } from "@/components/admin/content/TMDBSearchGrid";
import { sortContent, usePersistedSort, useContentSelection } from "@/components/admin/content/contentListUtils";
import { Clapperboard, Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w780";
const ratingColor = (r: number) => (r >= 7 ? "text-emerald-400" : r >= 5 ? "text-amber-400" : "text-red-400");

const AdminSeries = () => {
  const { user } = useAuth();
  const { results, loading: searching, search, setResults, fetchDetails } = useTMDBSearch();
  const { data: series, isLoading } = useAllSeries();
  useRealtimeSeries();
  const addSeries = useAddSeries();
  const toggleSeries = useToggleSeries();
  const deleteSeries = useDeleteSeries();
  const updateSeries = useUpdateSeries();
  const reorderSeries = useReorderSeries();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"search" | "popular">("search");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FeaturedSeries | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "incomplete">("all");
  const { sortMode, setSortMode } = usePersistedSort("admin:series:sort");
  const selection = useContentSelection();

  const batchActive = !!batchProgress || bulkRunning;
  const all = series ?? [];

  const filtered = useMemo(() => {
    const term = listSearch.trim().toLocaleLowerCase("pt-BR");
    const byStatus = all.filter((s) => {
      if (statusFilter === "active") return s.active;
      if (statusFilter === "inactive") return !s.active;
      if (statusFilter === "incomplete") return !s.genre || !s.backdrop_url;
      return true;
    });
    const bySearch = term
      ? byStatus.filter(
          (s) =>
            s.title.toLocaleLowerCase("pt-BR").includes(term) ||
            (s.genre || "").toLocaleLowerCase("pt-BR").includes(term)
        )
      : byStatus;
    return sortContent(bySearch, sortMode);
  }, [all, listSearch, statusFilter, sortMode]);

  const isFiltering = listSearch.trim() !== "" || statusFilter !== "all" || sortMode !== "manual";
  const pagination = usePagination({ total: filtered.length, pageSize: 20 });
  const paginated = filtered.slice(pagination.start, pagination.end);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isFiltering) return;
    const oldIndex = all.findIndex((s) => s.id === active.id);
    const newIndex = all.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(all, oldIndex, newIndex);
    reorderSeries.mutate(newOrder.map((s) => s.id), {
      onError: (e: any) => toast.error(e?.message || "Falha ao salvar ordem"),
      onSuccess: () => toast.success("Ordem atualizada"),
    });
  };

  const bulkSetActive = async (active: boolean) => {
    if (selection.selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selection.selectedIds);
    const { error } = await supabase.from("featured_series").update({ active }).in("id", ids);
    setBulkRunning(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["featured_series"] });
    toast.success(`${ids.length} série(s) ${active ? "ativada(s)" : "desativada(s)"}`);
    selection.exitSelection();
  };

  const bulkDelete = async () => {
    if (selection.selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selection.selectedIds);
    const { error } = await supabase.from("featured_series").delete().in("id", ids);
    setBulkRunning(false);
    setConfirmBulkDelete(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["featured_series"] });
    toast.success(`${ids.length} série(s) removida(s)`);
    selection.exitSelection();
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    search("search_tv", query.trim());
  };
  const loadPopular = () => { setTab("popular"); setResults([]); setSearched(true); search("popular_tv"); };
  const switchToSearch = () => { setTab("search"); setResults([]); setSearched(false); };
  const clearQuery = () => { setQuery(""); setResults([]); setSearched(false); };

  const handleAdd = async (r: TMDBResult) => {
    if (all.some((s) => s.tmdb_id === r.id)) { toast.info("Série já adicionada"); return; }
    setAddingId(r.id);
    try {
      const details = await fetchDetails("tv_details", r.id);
      const genreText = details?.genres?.map((g) => g.name).join(", ") || null;
      await addSeries.mutateAsync({
        tmdb_id: r.id,
        title: r.name || r.title || "",
        poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
        backdrop_url: (r as any).backdrop_path ? `${TMDB_BACKDROP}${(r as any).backdrop_path}` : null,
        overview: r.overview || null,
        rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
        year: r.first_air_date ? parseInt(r.first_air_date) : null,
        genre: genreText,
        added_by: user?.id || null,
      });
      toast.success("Série adicionada!");
    } catch (err: any) { toast.error(err.message); }
    finally { setAddingId(null); }
  };

  const handleRefreshOne = async (s: FeaturedSeries) => {
    setRefreshingId(s.id);
    try {
      const details = await fetchDetails("tv_details", s.tmdb_id);
      if (!details) { toast.error("Não foi possível buscar detalhes"); return; }
      const genreText = details.genres?.map((g) => g.name).join(", ") || null;
      await updateSeries.mutateAsync({
        id: s.id,
        genre: genreText,
        rating: (details as any).vote_average ? Math.round((details as any).vote_average * 10) / 10 : s.rating,
        overview: (details as any).overview || s.overview,
        backdrop_url: (details as any).backdrop_path ? `${TMDB_BACKDROP}${(details as any).backdrop_path}` : s.backdrop_url,
      });
      toast.success(`"${s.title}" atualizada!`);
    } catch (err: any) { toast.error(err.message); }
    finally { setRefreshingId(null); }
  };

  const runBatch = async (list: FeaturedSeries[], label: string) => {
    setBatchProgress({ current: 0, total: list.length });
    let updated = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      setBatchProgress({ current: i + 1, total: list.length });
      try {
        const details = await fetchDetails("tv_details", s.tmdb_id);
        if (details) {
          const genreText = details.genres?.map((g) => g.name).join(", ") || null;
          await updateSeries.mutateAsync({
            id: s.id,
            genre: genreText,
            rating: (details as any).vote_average ? Math.round((details as any).vote_average * 10) / 10 : s.rating,
            overview: (details as any).overview || s.overview,
            backdrop_url: (details as any).backdrop_path ? `${TMDB_BACKDROP}${(details as any).backdrop_path}` : s.backdrop_url,
          });
          updated++;
        }
      } catch { /* continue */ }
    }
    setBatchProgress(null);
    toast.success(`${updated} de ${list.length} ${label} atualizadas!`);
  };

  const incomplete = all.filter((s) => !s.genre || !s.backdrop_url);
  const activeCount = all.filter((s) => s.active).length;
  const totalCount = all.length;
  const ratedCount = all.filter((s) => s.rating != null).length;
  const avgRating = ratedCount ? all.reduce((acc, s) => acc + (s.rating || 0), 0) / ratedCount : 0;

  return (
    <div className="space-y-5">
      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold">Total</p>
            <p className="text-lg font-extrabold text-foreground tabular-nums mt-0.5">{totalCount}</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold">Ativas</p>
            <p className="text-lg font-extrabold text-purple-400 tabular-nums mt-0.5">{activeCount}</p>
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
            <Clapperboard className="h-4 w-4 text-purple-400" />
            Buscar Séries
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div role="tablist" aria-label="Modo de busca" className="flex gap-1.5">
            {[
              { key: "search" as const, label: "Buscar", onClick: switchToSearch },
              { key: "popular" as const, label: "Populares", onClick: loadPopular },
            ].map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={t.onClick}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all min-h-[44px] flex-1 sm:flex-initial ${tab === t.key ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" : "glass-panel text-muted-foreground/70"}`}
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
                aria-label="Buscar série no TMDB"
                placeholder="Nome da série..."
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
            <p className="text-[11px] text-muted-foreground/60 italic px-1">Mostrando séries populares — clique em "Buscar" para voltar.</p>
          )}

          {searching && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />Buscando...
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">Nenhum resultado encontrado</p>
            </div>
          )}

          <TMDBSearchGrid
            results={results}
            addingId={addingId}
            isAdded={(r) => all.some((s) => s.tmdb_id === r.id)}
            onAdd={handleAdd}
            addedLabel="Adicionada"
          />
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <ContentListHeader
          title={`Adicionadas (${activeCount} ativas / ${totalCount})`}
          selectionMode={selection.selectionMode}
          selectedCount={selection.selectedIds.size}
          totalCount={totalCount}
          incompleteCount={incomplete.length}
          incompleteLabel="incompletas"
          busy={batchActive}
          bulkRunning={bulkRunning}
          batchProgress={batchProgress}
          accentClass="text-purple-400"
          onBatchIncomplete={() => incomplete.length ? runBatch(incomplete, "séries incompletas") : toast.info("Todas as séries já estão completas")}
          onBatchAll={() => runBatch(all, "séries")}
          onEnterSelection={selection.enterSelection}
          onExitSelection={selection.exitSelection}
          onSelectAll={() => selection.selectAll(filtered.map((s) => s.id))}
          onClearSelection={selection.clearSelection}
          onBulkActive={bulkSetActive}
          onBulkDelete={() => setConfirmBulkDelete(true)}
        />

        {totalCount > 0 && (
          <ContentListFilters
            search={listSearch}
            onSearchChange={(v) => { setListSearch(v); pagination.goToPage(1); }}
            sortMode={sortMode}
            onSortChange={(v) => { setSortMode(v); pagination.goToPage(1); }}
            chips={[
              { value: "all", label: "Todas", count: totalCount },
              { value: "active", label: "Ativas", count: activeCount },
              { value: "inactive", label: "Inativas", count: totalCount - activeCount },
              { value: "incomplete", label: "Incompletas", count: incomplete.length },
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
              <Clapperboard className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhuma série adicionada.</p>
              <p className="text-[10px] text-muted-foreground/50">Busque um título e adicione ao catálogo.</p>
              <Button size="sm" variant="outline" className="min-h-11 text-xs gap-1" onClick={() => document.getElementById("tmdb-search-input")?.focus()}>
                <Search className="h-3.5 w-3.5" /> Buscar série
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhuma série encontrada com esses filtros</p>
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
                <SortableContext items={paginated.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {paginated.map((s) => (
                      <SortableContentRow
                        key={s.id}
                        item={s}
                        refreshing={refreshingId === s.id}
                        disabled={batchActive}
                        selected={selection.selectedIds.has(s.id)}
                        selectionMode={selection.selectionMode}
                        dragDisabled={isFiltering}
                        genreClass="text-purple-400/70"
                        hoverClass="hover:text-purple-400"
                        onSelectChange={selection.toggleSelect}
                        onRefresh={() => handleRefreshOne(s)}
                        onToggle={(v) => toggleSeries.mutate({ id: s.id, active: v })}
                        onDelete={() => setPendingDelete(s)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {filtered.length > 20 && (
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
              total={filtered.length}
              noun={["série", "séries"]}
            />
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover série?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title ? `"${pendingDelete.title}" será removida permanentemente do catálogo.` : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingDelete) deleteSeries.mutate(pendingDelete.id); setPendingDelete(null); }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDelete} onOpenChange={(o) => !o && !bulkRunning && setConfirmBulkDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {selection.selectedIds.size} série(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As séries selecionadas serão removidas permanentemente do catálogo.
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

export default AdminSeries;
