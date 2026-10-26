import { Search, X, Trophy, Clock3 } from "lucide-react";
import { ChannelMiniLogo } from "@/components/public/ChannelBadge";

export type StatusFilter = "all" | "live" | "soon" | "ended";
export type SortMode = "sport" | "time";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  statusCounts: Record<StatusFilter, number>;
  sort: SortMode;
  onSort: (v: SortMode) => void;
  channels: { key: string; name: string; count: number }[];
  channel: string | null;
  onChannel: (v: string | null) => void;
}

const STATUS_CHIPS: { value: StatusFilter; label: string; dot?: string }[] = [
  { value: "all", label: "Todos" },
  { value: "live", label: "Ao vivo", dot: "#ff3b3b" },
  { value: "soon", label: "Em breve", dot: "#fbbf24" },
  { value: "ended", label: "Encerrados", dot: "rgba(255,255,255,0.45)" },
];

const chipBase =
  "shrink-0 h-11 px-3.5 inline-flex items-center gap-1.5 rounded-full text-[12.5px] font-semibold border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60";

const chipStyle = (active: boolean, activeBg = "#00ff87") => ({
  color: active ? "#07080a" : "#fff",
  background: active ? activeBg : "rgba(255,255,255,0.05)",
  borderColor: active ? "transparent" : "rgba(255,255,255,0.12)",
});

export const ScheduleToolbar = ({
  search,
  onSearch,
  status,
  onStatus,
  statusCounts,
  sort,
  onSort,
  channels,
  channel,
  onChannel,
}: Props) => {
  return (
    <div className="mb-4 space-y-2.5">
      {/* Busca + ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar time, competição ou canal"
            aria-label="Buscar time, competição ou canal"
            enterKeyHint="search"
            autoComplete="off"
            className="w-full h-11 pl-9 pr-10 rounded-xl bg-white/[0.05] border border-white/10 text-[14px] text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#00ff87]/50 focus:border-transparent"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div
          className="shrink-0 grid grid-cols-2 sm:inline-flex rounded-xl border border-white/10 bg-white/[0.05] p-0.5"
          role="group"
          aria-label="Organizar lista"
        >
          {(
            [
              { value: "time", label: "Por horário", short: "Horário", Icon: Clock3 },
              { value: "sport", label: "Por esporte", short: "Esporte", Icon: Trophy },
            ] as const
          ).map(({ value, label, short, Icon }) => {
            const active = sort === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onSort(value)}
                aria-pressed={active}
                aria-label={label}
                title={label}
                className="h-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
                style={{
                  background: active ? "rgba(0,255,135,0.14)" : "transparent",
                  color: active ? "#00ff87" : "rgba(255,255,255,0.65)",
                }}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div
        className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none" }}
        role="toolbar"
        aria-label="Filtrar por status"
      >
        {STATUS_CHIPS.map((c) => {
          const active = c.value === status;
          const count = statusCounts[c.value];
          if (c.value !== "all" && count === 0 && !active) return null;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onStatus(c.value)}
              aria-pressed={active}
              aria-label={`${c.label}, ${count} ${count === 1 ? "jogo" : "jogos"}`}
              className={chipBase}
              style={chipStyle(active, c.value === "live" ? "#ff3b3b" : "#00ff87")}
            >
              {c.dot && !active && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} aria-hidden />
              )}
              {c.label}
              <span
                className="text-[10.5px] px-1.5 rounded-full font-bold tabular-nums"
                style={{ background: active ? "rgba(7,8,10,0.18)" : "rgba(255,255,255,0.10)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Canais */}
      {channels.length > 1 && (
        <div
          className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none" }}
          role="toolbar"
          aria-label="Filtrar por canal"
        >
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/50 font-bold">📺 Canal</span>
          <button
            type="button"
            onClick={() => onChannel(null)}
            aria-pressed={channel === null}
            className={`${chipBase} h-10 text-[12px]`}
            style={chipStyle(channel === null)}
          >
            Todos
          </button>
          {channels.map((ch) => {
            const active = channel === ch.key;
            return (
              <button
                key={ch.key}
                type="button"
                onClick={() => onChannel(active ? null : ch.key)}
                aria-pressed={active}
                aria-label={`${ch.name}, ${ch.count} ${ch.count === 1 ? "jogo" : "jogos"}`}
                className={`${chipBase} h-10 pl-1.5 text-[12px]`}
                style={chipStyle(active)}
              >
                <ChannelMiniLogo name={ch.name} size="sm" />
                <span className="max-w-[140px] truncate">{ch.name}</span>
                <span className="text-[10px] opacity-70 tabular-nums">{ch.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
