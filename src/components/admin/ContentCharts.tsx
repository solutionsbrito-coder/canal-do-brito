import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const _COLORS = {
  banners: "#34d399",
  filmes: "#60a5fa",
  series: "#a78bfa",
  novidades: "#fbbf24",
  jogos: "#f87171",
};

const LABELS: Record<string, string> = {
  banners: "Banners",
  filmes: "Filmes",
  series: "Séries",
  novidades: "Novidades",
  jogos: "Jogos",
};

const barConfig: ChartConfig = {
  ativos: { label: "Ativos", color: "#34d399" },
  inativos: { label: "Inativos", color: "hsl(var(--muted))" },
};

interface Props {
  totals: Record<string, number>;
  actives: Record<string, number>;
  isLoading: boolean;
}

export const ContentCharts = ({ totals, actives, isLoading }: Props) => {
  const barData = useMemo(
    () =>
      Object.keys(LABELS).map((key) => ({
        name: LABELS[key],
        ativos: actives[key] || 0,
        inativos: (totals[key] || 0) - (actives[key] || 0),
      })),
    [totals, actives],
  );

  if (isLoading) {
    return (
      <Skeleton className="h-44 rounded-xl" />
    );
  }

  return (
    <div>
      {/* Único gráfico: ativo vs inativo por tipo */}
      <div className="glass-panel rounded-xl p-4 border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Conteúdo ativo por tipo</h3>
        <ChartContainer config={barConfig} className="h-40 w-full">
          <BarChart data={barData} layout="vertical" margin={{ left: 12, right: 12, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={72} axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="ativos" stackId="a" radius={[0, 0, 0, 0]} fill="var(--color-ativos)" />
            <Bar dataKey="inativos" stackId="a" radius={[0, 4, 4, 0]} fill="var(--color-inativos)" />
          </BarChart>
        </ChartContainer>
      </div>

    </div>
  );
};
