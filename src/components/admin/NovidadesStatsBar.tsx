import { Film, Tv, Sparkles, AlertTriangle, Star, CheckCircle2 } from "lucide-react";
import type { NewsRelease } from "@/hooks/useNewsReleases";

interface Props {
  items: NewsRelease[];
}

const Stat = ({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: string | number; tone?: "default" | "warn" | "ok" | "info" }) => {
  const tones: Record<string, string> = {
    default: "text-foreground border-white/[0.08]",
    warn: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    ok: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    info: "text-sky-400 border-sky-500/30 bg-sky-500/5",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 glass-panel ${tones[tone]}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 leading-none font-body">{label}</p>
        <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
};

export const NovidadesStatsBar = ({ items }: Props) => {
  const total = items.length;
  const ativos = items.filter((i) => i.active).length;
  const filmes = items.filter((i) => i.content_type === "movie").length;
  const series = items.filter((i) => i.content_type === "series" || i.content_type === "tv").length;
  const semGenero = items.filter((i) => !i.genres).length;
  const ratings = items.map((i) => i.rating).filter((r): r is number => typeof r === "number" && r > 0);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      <Stat icon={Sparkles} label="Total" value={total} />
      <Stat icon={CheckCircle2} label="Ativos" value={ativos} tone="ok" />
      <Stat icon={Film} label="Filmes" value={filmes} tone="info" />
      <Stat icon={Tv} label="Séries" value={series} tone="info" />
      <Stat icon={AlertTriangle} label="S/ gênero" value={semGenero} tone={semGenero > 0 ? "warn" : "default"} />
      <Stat icon={Star} label="Nota méd." value={avg} />
    </div>
  );
};
