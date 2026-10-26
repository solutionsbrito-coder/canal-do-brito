import { useMemo, useState, useEffect } from "react";
import { Activity, Clock, CalendarX, HardDrive, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCountdown } from "@/lib/dateUtils";
import type { Banner } from "@/hooks/useBanners";

interface Props {
  banners: Banner[] | undefined;
  onPreview: () => void;
}

export const BannerHealthPanel = ({ banners, onPreview }: Props) => {
  // Re-render every 60s for countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const list = banners || [];
    const now = Date.now();
    const active = list.filter((b) => b.active);
    const nextActivation = list
      .filter((b) => b.publish_at && new Date(b.publish_at).getTime() > now)
      .sort((a, b) => new Date(a.publish_at!).getTime() - new Date(b.publish_at!).getTime())[0];
    const nextExpiration = active
      .filter((b) => b.expires_at && new Date(b.expires_at).getTime() > now)
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0];
    return { activeCount: active.length, nextActivation, nextExpiration, total: list.length };
  }, [banners]);

  if (!banners || banners.length === 0) return null;

  const Cell = ({ icon, label, value, sub, tone = "default" }: {
    icon: React.ReactNode; label: string; value: string; sub?: string;
    tone?: "default" | "amber" | "red" | "emerald";
  }) => {
    const toneCls = {
      default: "text-foreground",
      amber: "text-amber-400",
      red: "text-red-400",
      emerald: "text-emerald-400",
    }[tone];
    return (
      <div className="flex-1 min-w-[140px] glass-panel rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mb-1">
          {icon}<span>{label}</span>
        </div>
        <p className={`text-sm font-bold leading-tight ${toneCls}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{sub}</p>}
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-bold">Saúde da categoria</h4>
        </div>
        <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5" />
          Pré-visualizar como usuário
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Cell
          icon={<Activity className="h-3 w-3" />}
          label="Ativos agora"
          value={`${stats.activeCount} / ${stats.total}`}
          tone="emerald"
        />
        <Cell
          icon={<Clock className="h-3 w-3" />}
          label="Próxima ativação"
          value={stats.nextActivation ? formatCountdown(stats.nextActivation.publish_at!) : "—"}
          sub={stats.nextActivation ? new Date(stats.nextActivation.publish_at!).toLocaleString("pt-BR") : "Nenhuma agendada"}
          tone={stats.nextActivation ? "amber" : "default"}
        />
        <Cell
          icon={<CalendarX className="h-3 w-3" />}
          label="Próxima expiração"
          value={stats.nextExpiration ? formatCountdown(stats.nextExpiration.expires_at!) : "—"}
          sub={stats.nextExpiration ? new Date(stats.nextExpiration.expires_at!).toLocaleString("pt-BR") : "Nenhuma definida"}
          tone={stats.nextExpiration ? "red" : "default"}
        />
        <Cell
          icon={<HardDrive className="h-3 w-3" />}
          label="Total no banco"
          value={`${stats.total}`}
          sub={`${stats.activeCount} ativos`}
        />
      </div>
    </div>
  );
};
