import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, History, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRestoreScheduleVersion, useScheduleVersions, type SchedulePublicationVersion } from "@/hooks/useScheduleVersions";

const ACTION_LABEL = { publish: "Publicação", republish: "Republicação", restore: "Restauração" } as const;

export function ScheduleVersionHistory() {
  const { data: versions = [], isLoading, isError, refetch } = useScheduleVersions();
  const restore = useRestoreScheduleVersion();
  const [selected, setSelected] = useState<SchedulePublicationVersion | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<SchedulePublicationVersion | null>(null);

  const handleRestore = async () => {
    if (!restoreVersion) return;
    try {
      const count = await restore.mutateAsync(restoreVersion.id);
      toast.success(`Versão restaurada com ${count} jogo${count === 1 ? "" : "s"}.`);
      setRestoreVersion(null);
    } catch {
      toast.error("Não foi possível restaurar esta versão. Tente novamente.");
    }
  };

  return (
    <section className="glass-panel rounded-2xl overflow-hidden" aria-labelledby="schedule-history-title">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" aria-hidden />
            <h3 id="schedule-history-title" className="text-sm font-bold text-foreground">Histórico de publicações</h3>
          </div>
          {isError && <Button variant="ghost" size="sm" onClick={() => refetch()}>Tentar novamente</Button>}
        </div>

        {isLoading ? (
          <div className="mt-4 h-16 rounded-xl skeleton-shimmer" aria-label="Carregando histórico" />
        ) : isError ? (
          <p className="mt-3 text-xs text-destructive">O histórico não pôde ser carregado.</p>
        ) : versions.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">As próximas publicações aparecerão aqui e poderão ser restauradas.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {versions.map((version) => (
              <li key={version.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{ACTION_LABEL[version.action]}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {format(new Date(version.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })} · {version.game_count} jogo{version.game_count === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground/80">{version.dates.map((date) => date.split("-").reverse().join("/")).join(", ")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setSelected(version)} aria-label="Ver jogos desta versão">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11 text-amber-400" onClick={() => setRestoreVersion(version)} aria-label="Restaurar esta versão">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Jogos desta versão</AlertDialogTitle>
            <AlertDialogDescription>{selected?.game_count ?? 0} jogo(s) em {selected?.dates.length ?? 0} data(s).</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="grid gap-2" aria-label="Jogos salvos nesta versão">
            {selected?.games.map((game, index) => (
              <li key={`${game.date}-${game.game_time}-${index}`} className="rounded-lg border border-white/[0.08] p-3 text-xs">
                <p className="font-semibold text-foreground">{game.game_time.slice(0, 5)} · {game.home_team}{game.away_team ? ` x ${game.away_team}` : ""}</p>
                <p className="mt-1 text-muted-foreground">{game.competition} · {game.channels?.join(", ") || "Sem canal"}</p>
              </li>
            ))}
          </ul>
          <AlertDialogFooter><AlertDialogCancel>Fechar</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!restoreVersion} onOpenChange={(open) => !open && setRestoreVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar esta programação?</AlertDialogTitle>
            <AlertDialogDescription>
              Os jogos atuais das datas {restoreVersion?.dates.map((date) => date.split("-").reverse().join("/")).join(", ")} serão substituídos pelos {restoreVersion?.game_count} jogos salvos nesta versão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restore.isPending} className="bg-amber-600 hover:bg-amber-700">
              {restore.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Restaurar versão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
