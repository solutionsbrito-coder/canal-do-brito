import { ReactNode } from "react";
import { LucideIcon, Inbox, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// AdminEmptyState — used when a list/section has no data
// ============================================================================
interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}
export function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={`glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center ${className ?? ""}`}
    >
      <div className="rounded-full border border-white/[0.08] bg-white/[0.04] p-3">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ============================================================================
// AdminErrorState — used when a fetch fails
// ============================================================================
interface AdminErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}
export function AdminErrorState({
  title = "Não foi possível carregar",
  description = "Ocorreu um erro ao buscar os dados. Tente novamente.",
  onRetry,
  className,
}: AdminErrorStateProps) {
  return (
    <div
      role="alert"
      className={`glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-6 py-10 text-center ${className ?? ""}`}
    >
      <div className="rounded-full border border-destructive/30 bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="mt-1 min-h-11 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// AdminLoadingCard — skeleton for a card/row while loading
// ============================================================================
interface AdminLoadingCardProps {
  rows?: number;
  className?: string;
}
export function AdminLoadingCard({ rows = 3, className }: AdminLoadingCardProps) {
  return (
    <div
      className={`glass-panel space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 ${className ?? ""}`}
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="skeleton-shimmer h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="skeleton-shimmer h-3 w-2/3 rounded" />
          <Skeleton className="skeleton-shimmer h-2.5 w-1/3 rounded" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="skeleton-shimmer h-8 w-full rounded" />
      ))}
    </div>
  );
}
