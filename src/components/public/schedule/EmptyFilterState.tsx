import { motion } from "framer-motion";
import { CalendarOff } from "lucide-react";

interface EmptyFilterStateProps {
  description?: string;
  onClear: () => void;
}

export const EmptyFilterState = ({ description, onClear }: EmptyFilterStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center text-center py-12 px-4 space-y-3"
    role="status"
  >
    <div className="p-4 rounded-2xl bg-muted/20 border border-border/20">
      <CalendarOff className="h-7 w-7 text-muted-foreground/40" aria-hidden />
    </div>
    <p className="text-sm text-muted-foreground/70 max-w-xs">
      {description || "Nenhum jogo corresponde aos filtros selecionados."}
    </p>
    <button
      onClick={onClear}
      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/20 transition-all"
    >
      Limpar filtros
    </button>
  </motion.div>
);
