import { useState, useEffect } from "react";
import {
  useArchivedDatesSummary,
  useArchivedDailyGamesPage,
  useRestoreArchivedDay,
  useUpdateDailyGame,
  useDeleteDailyGame,
  ARCHIVED_PAGE_SIZE,
} from "@/hooks/useDailyGames";
import { SPORT_EMOJI, isSingleEvent, type SportType } from "@/lib/gameUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, ArchiveRestore, Loader2, Archive, Search, ChevronLeft, ChevronRight, History, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
};

export const ArchivedGamesManager = () => {
  const [expanded, setExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRestoreDay, setPendingRestoreDay] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [dateFilter, debounced]);

  const { data: dates, isLoading: datesLoading } = useArchivedDatesSummary();
  const { data: pageData, isLoading, isFetching } = useArchivedDailyGamesPage({
    date: dateFilter,
    search: debounced,
    page,
  });
  const updateGame = useUpdateDailyGame();
  const deleteGame = useDeleteDailyGame();
  const restoreDay = useRestoreArchivedDay();

  const totalArchived = (dates ?? []).reduce((a, d) => a + d.count, 0);
  const rows = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ARCHIVED_PAGE_SIZE));

  const handleUnarchive = (id: string) => {
    updateGame.mutate(
      { id, archived: false, active: true },
      { onSuccess: () => toast.success("Jogo restaurado!") }
    );
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteGame.mutate(pendingDeleteId, { onSuccess: () => toast.success("Jogo excluído!") });
    setPendingDeleteId(null);
  };

  const confirmRestoreDay = () => {
    if (!pendingRestoreDay) return;
    restoreDay.mutate(pendingRestoreDay, {
      onSuccess: (n) => toast.success(`${n} jogo(s) de ${fmtDate(pendingRestoreDay)} restaurado(s)`),
      onError: () => toast.error("Não foi possível restaurar o dia"),
    });
    setPendingRestoreDay(null);
  };

  return (
    <>
      <div className="glass-panel rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left min-h-[64px]"
        >
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Archive className="h-4 w-4 text-muted-foreground" />
              Histórico / Jogos Arquivados
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {datesLoading ? "Carregando…" : `${totalArchived} jogos em ${dates?.length ?? 0} datas`}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <div className="border-t border-white/[0.06]">
            {/* Busca + filtro de data */}
            <div className="p-4 sm:px-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar time ou competição nos arquivados"
                  aria-label="Buscar nos arquivados"
                  className="h-11 pl-9"
                />
              </div>
              {(dates?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="archived-date" className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
                    Data
                  </label>
                  <select
                    id="archived-date"
                    value={dateFilter ?? ""}
                    onChange={(e) => setDateFilter(e.target.value || null)}
                    className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Todas as datas ({totalArchived})</option>
                    {(dates ?? []).map((d) => (
                      <option key={d.date} value={d.date}>
                        {fmtDate(d.date)} · {d.count} jogo{d.count !== 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  {dateFilter && (
                    <Button
                      variant="outline"
                      className="min-h-11 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                      onClick={() => setPendingRestoreDay(dateFilter)}
                      disabled={restoreDay.isPending}
                    >
                      <History className="h-4 w-4" />
                      <span className="hidden sm:inline">Restaurar dia</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 pb-5 space-y-2" aria-busy={isFetching}>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center">
                  <Archive className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {debounced || dateFilter ? "Nenhum jogo arquivado corresponde ao filtro" : "Nenhum jogo arquivado"}
                  </p>
                </div>
              ) : (
                rows.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-xl glass-panel p-3 flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" aria-hidden>{SPORT_EMOJI[game.sport_type as SportType] || "⚽"}</span>
                        <p className="text-sm font-bold text-foreground truncate">
                          {isSingleEvent(game) ? game.home_team : `${game.home_team} x ${game.away_team}`}
                        </p>
                        <Badge className="bg-muted/50 text-muted-foreground border-muted text-[10px] px-1.5 py-0 shrink-0">
                          {fmtDate(game.date)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        ⏰ {game.game_time?.slice(0, 5)} • {game.competition}
                        {game.competition_detail ? ` · ${game.competition_detail}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">
                        📺 {game.channels?.join(", ") || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnarchive(game.id)}
                        className="min-h-11 text-xs text-primary gap-1"
                        aria-label="Restaurar jogo"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        <span className="hidden sm:inline">Restaurar</span>
                      </Button>
                      <button
                        onClick={() => setPendingDeleteId(game.id)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-destructive"
                        aria-label="Remover permanentemente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {pageCount > 1 && (
                <nav className="flex items-center justify-between pt-2" aria-label="Paginação dos arquivados">
                  <Button
                    variant="ghost"
                    className="min-h-11 gap-1"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Página {page + 1} de {pageCount} · {total} jogos
                  </span>
                  <Button
                    variant="ghost"
                    className="min-h-11 gap-1"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover jogo permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O jogo será removido do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 min-h-11">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingRestoreDay} onOpenChange={(o) => !o && setPendingRestoreDay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar a programação de {pendingRestoreDay ? fmtDate(pendingRestoreDay) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os jogos arquivados dessa data voltam a ficar ativos e visíveis (se a data for hoje ou amanhã).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestoreDay} className="min-h-11">Restaurar dia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
