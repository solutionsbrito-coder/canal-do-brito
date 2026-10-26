import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Check, Loader2, RefreshCw, Trash2, X } from "lucide-react";

interface ContentListHeaderProps {
  title: string;
  selectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  incompleteCount: number;
  incompleteLabel?: string;
  busy: boolean;
  bulkRunning: boolean;
  batchProgress: { current: number; total: number } | null;
  accentClass?: string;
  onBatchIncomplete: () => void;
  onBatchAll: () => void;
  onEnterSelection: () => void;
  onExitSelection: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkActive: (active: boolean) => void;
  onBulkDelete: () => void;
}

/**
 * Cabeçalho compartilhado da lista de conteúdo: ações em lote do TMDB,
 * modo de seleção múltipla e barra de progresso.
 */
export const ContentListHeader = ({
  title,
  selectionMode,
  selectedCount,
  totalCount,
  incompleteCount,
  incompleteLabel = "incompletos",
  busy,
  bulkRunning,
  batchProgress,
  accentClass = "text-primary",
  onBatchIncomplete,
  onBatchAll,
  onEnterSelection,
  onExitSelection,
  onSelectAll,
  onClearSelection,
  onBulkActive,
  onBulkDelete,
}: ContentListHeaderProps) => {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  return (
  <>
    <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-white/[0.06]">
      <h3 className="text-sm font-bold text-foreground">
        {title}
        {selectionMode && selectedCount > 0 && (
          <span className={`${accentClass} font-normal`}> · {selectedCount} selecionado(s)</span>
        )}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {!selectionMode ? (
          <>
            {incompleteCount > 0 && (
              <Button size="sm" variant="outline" onClick={onBatchIncomplete} disabled={busy} className="text-[10px] gap-1">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {incompleteCount} {incompleteLabel}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onBatchAll} disabled={busy || totalCount === 0} className="text-[10px] gap-1">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar todos
            </Button>
            <Button size="sm" variant="outline" onClick={onEnterSelection} disabled={busy || totalCount === 0} className="text-[10px] gap-1">
              <Check className="h-3 w-3" />
              Selecionar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={onSelectAll} disabled={bulkRunning} className="text-[10px]">Todos</Button>
            <Button size="sm" variant="ghost" onClick={onClearSelection} disabled={bulkRunning || selectedCount === 0} className="text-[10px]">Limpar</Button>
            <Button size="sm" variant="outline" onClick={() => onBulkActive(true)} disabled={bulkRunning || selectedCount === 0} className="text-[10px] gap-1">
              {bulkRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Ativar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDeactivate(true)} disabled={bulkRunning || selectedCount === 0} className="text-[10px] gap-1">
              {bulkRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Desativar
            </Button>
            <Button size="sm" variant="destructive" onClick={onBulkDelete} disabled={bulkRunning || selectedCount === 0} className="text-[10px] gap-1">
              <Trash2 className="h-3 w-3" />
              Remover
            </Button>
            <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desativar {selectedCount} item(ns)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Os itens selecionados deixam de aparecer no site público. Você pode reativá-los depois.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setConfirmDeactivate(false); onBulkActive(false); }}>
                    Desativar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="ghost" onClick={onExitSelection} disabled={bulkRunning} className="text-[10px]" aria-label="Sair do modo de seleção">
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
  </>
  );
};
