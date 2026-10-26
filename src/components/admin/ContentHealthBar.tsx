import { useMemo } from "react";
import { Activity } from "lucide-react";

interface ContentHealthBarProps {
  totalActive: number;
  totalAll: number;
  isLoading: boolean;
}

export const ContentHealthBar = ({ totalActive, totalAll, isLoading }: ContentHealthBarProps) => {
  const { percent, colorClass, barColor, label, excellent } = useMemo(() => {
    if (totalAll === 0) return { percent: 0, colorClass: "text-muted-foreground", barColor: "bg-muted", label: "Sem conteúdo", excellent: false };
    const p = Math.round((totalActive / totalAll) * 100);
    if (p >= 90) return { percent: p, colorClass: "text-emerald-400", barColor: "bg-emerald-500", label: "Saudável", excellent: true };
    if (p > 80) return { percent: p, colorClass: "text-emerald-400", barColor: "bg-emerald-500", label: "Saudável", excellent: false };
    if (p > 50) return { percent: p, colorClass: "text-amber-400", barColor: "bg-amber-500", label: "Atenção", excellent: false };
    return { percent: p, colorClass: "text-red-400", barColor: "bg-red-500", label: "Crítico", excellent: false };
  }, [totalActive, totalAll]);

  if (isLoading) return null;

  return (
    <div className="glass-panel rounded-xl p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${colorClass}`} />
          <span className="text-xs font-semibold text-foreground/90">Saúde do Conteúdo</span>
        </div>
        <div className="flex items-center gap-1.5">
          {excellent && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              🎉 Excelente
            </span>
          )}
          <span className={`text-xs font-bold ${colorClass}`}>{percent}%</span>
          <span className="text-[9px] text-muted-foreground/60">({totalActive}/{totalAll} ativos)</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`text-[9px] mt-1 ${colorClass}`}>{label}</p>
    </div>
  );
};
