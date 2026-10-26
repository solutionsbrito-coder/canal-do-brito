import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Radio, Clock, SearchX, RefreshCw, AlertCircle } from "lucide-react";
import { PremiumCTA } from "@/components/public/cinema/PremiumCTA";
import { useAllDailyGamesRange, type DailyGame } from "@/hooks/useDailyGames";
import { useRealtimeDailyGames } from "@/hooks/useRealtimeDailyGames";
import {
  type SportType,
  SPORT_LABEL,
  getLocalDateString,
  getGameStatus,
  midnightInSaoPaulo,
} from "@/lib/gameUtils";
import { gameKey } from "@/lib/dedup";
import { offsetDateStr } from "@/lib/whatsappText";
import { isValidDateParam } from "@/lib/agendaRedirect";
import { useChannelMappings } from "@/hooks/useChannelMappings";
import { resolveChannel, resolveChannels } from "@/lib/channelResolver";
import { track } from "@/lib/analytics";

import { LiveHeroCard } from "@/components/agenda/public/LiveHeroCard";
import { SportFilterBar, type FilterValue } from "@/components/agenda/public/SportFilterBar";
import { ScheduleToolbar, type StatusFilter, type SortMode } from "@/components/agenda/public/ScheduleToolbar";
import { HighlightsCarousel } from "@/components/agenda/public/HighlightsCarousel";
import { SportSection } from "@/components/agenda/public/SportSection";
import { TimeSection } from "@/components/agenda/public/TimeSection";
import { EmptyDayState } from "@/components/agenda/public/EmptyDayState";
import { AgendaSkeleton } from "@/components/agenda/public/AgendaSkeleton";
import { Button } from "@/components/ui/button";
import { curateHighlights, detectedSport } from "@/components/agenda/public/highlightsCuration";

const SPORT_ORDER: SportType[] = [
  "football", "basketball", "volleyball", "tennis",
  "mma", "boxing", "f1", "hockey", "baseball",
  "rugby", "surf", "cycling", "swimming", "golf",
];

function groupBySport(games: DailyGame[]): Record<string, DailyGame[]> {
  const out: Record<string, DailyGame[]> = {};
  for (const g of games) {
    const key = detectedSport(g);
    if (!out[key]) out[key] = [];
    out[key].push(g);
  }
  Object.values(out).forEach((arr) =>
    arr.sort((a, b) => a.game_time.localeCompare(b.game_time))
  );
  return out;
}

/** Remove visual duplicates (same teams + time + sport). */
function dedupGames(games: DailyGame[]): DailyGame[] {
  const seen = new Set<string>();
  const out: DailyGame[] = [];
  for (const g of games) {
    const k = `${g.date}|${gameKey(g)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(g);
  }
  return out;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const STATUS_RANK: Record<string, number> = { live: 0, soon: 1, upcoming: 2, ended: 3 };

const ProgramacaoTab = () => {
  useRealtimeDailyGames();
  const [params, setParams] = useSearchParams();
  const today = getLocalDateString();
  const tomorrow = offsetDateStr(today, 1);
  const rawDate = params.get("date");
  const dateIsAllowed = rawDate ? rawDate === today || rawDate === tomorrow : true;
  const date = rawDate && dateIsAllowed ? rawDate : today;

  const [filter, setFilterState] = useState<FilterValue>(() => {
    try { return (sessionStorage.getItem("agenda:sport") as FilterValue) || "all"; } catch { return "all"; }
  });
  const [search, setSearch] = useState("");
  const [status, setStatusState] = useState<StatusFilter>(() => {
    try { return (sessionStorage.getItem("agenda:status") as StatusFilter) || "all"; } catch { return "all"; }
  });
  const [sort, setSortState] = useState<SortMode>(() => {
    try {
      const saved = sessionStorage.getItem("agenda:sort");
      return saved === "sport" || saved === "time" ? saved : "time";
    } catch {
      return "time";
    }
  });
  const [channel, setChannelState] = useState<string | null>(() => {
    try { return sessionStorage.getItem("agenda:channel"); } catch { return null; }
  });

  // Analytics simples (sem ranking público)
  const setStatus = useCallback((v: StatusFilter) => {
    setStatusState(v);
    track("agenda_filter_status", { status: v });
  }, []);
  const setSort = useCallback((v: SortMode) => {
    setSortState(v);
    track("agenda_sort_change", { sort: v });
  }, []);
  const setChannel = useCallback((v: string | null) => {
    setChannelState(v);
    track("agenda_filter_channel", { channel: v ?? "all" });
  }, []);
  const setFilter = useCallback((v: FilterValue) => {
    setFilterState(v);
    track("agenda_filter_sport", { sport: v });
  }, []);
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) return;
    const id = setTimeout(() => track("agenda_search", { query_length: q.length }), 800);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    try { sessionStorage.setItem("agenda:sort", sort); } catch { /* noop */ }
  }, [sort]);
  useEffect(() => {
    try { sessionStorage.setItem("agenda:sport", filter); } catch { /* noop */ }
  }, [filter]);
  useEffect(() => {
    try { sessionStorage.setItem("agenda:status", status); } catch { /* noop */ }
  }, [status]);
  useEffect(() => {
    try {
      if (channel) sessionStorage.setItem("agenda:channel", channel);
      else sessionStorage.removeItem("agenda:channel");
    } catch { /* noop */ }
  }, [channel]);

  // Defensive cleanup: drop ?date if it's not today/tomorrow (or is malformed).
  useEffect(() => {
    if (rawDate && (!isValidDateParam(rawDate) || !dateIsAllowed)) {
      const next = new URLSearchParams(params);
      next.delete("date");
      setParams(next, { replace: true });
    }
  }, [rawDate, dateIsAllowed, params, setParams]);

  const scheduleDates = useMemo(() => [today, tomorrow], [today, tomorrow]);
  const gamesQuery = useAllDailyGamesRange(scheduleDates);
  const { isLoading, isError, isFetching, dataUpdatedAt, refetch } = gamesQuery;
  const rawGames = useMemo(() => (gamesQuery.data ?? []).filter((game) => game.date === date), [gamesQuery.data, date]);
  const tomorrowGamesRaw = useMemo(
    () => (gamesQuery.data ?? []).filter((game) => game.date === (date === today ? tomorrow : today)),
    [gamesQuery.data, date, today, tomorrow],
  );
  const tomorrowCount = useMemo(
    () => (date === today ? (tomorrowGamesRaw ?? []).filter((g) => !g.archived && g.active).length : 0),
    [tomorrowGamesRaw, date, today],
  );

  const games = useMemo(
    () => dedupGames((rawGames ?? []).filter((g) => !g.archived && g.active)),
    [rawGames]
  );

  // Tick a cada 20s para manter status ao vivo / minuto fresco
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 20000);
    return () => clearInterval(id);
  }, []);

  const isToday = date === today;

  // Status por jogo (recalculado a cada tick)
  const statusById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getGameStatus>>();
    for (const g of games) m.set(g.id, isToday ? getGameStatus(g) : "upcoming");
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, isToday, tick]);

  const liveGames = useMemo(
    () => games.filter((g) => statusById.get(g.id) === "live"),
    [games, statusById],
  );

  // "Em breve" = tudo que ainda vai começar (próximos primeiro)
  const matchesStatus = useCallback(
    (g: DailyGame, wanted: StatusFilter) => {
      if (wanted === "all") return true;
      const s = statusById.get(g.id);
      if (wanted === "soon") return s === "soon" || s === "upcoming";
      return s === wanted;
    },
    [statusById],
  );

  const statusCounts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: games.length, live: 0, soon: 0, ended: 0 };
    for (const g of games) {
      if (matchesStatus(g, "live")) c.live++;
      else if (matchesStatus(g, "soon")) c.soon++;
      else if (matchesStatus(g, "ended")) c.ended++;
    }
    return c;
  }, [games, matchesStatus]);

  // Canais: agrupa pelo nome oficial (regra central), para ESPN2/ESPN 2 virarem um chip só
  const { data: channelMappings } = useChannelMappings();
  // Aliases cadastrados por canal (para a busca achar "PFC" → Premiere)
  const aliasKeysByMappingId = useMemo(() => {
    const m = new Map<string, string[]>();
    channelMappings?.forEach((mapping, key) => {
      const arr = m.get(mapping.id) ?? [];
      arr.push(key);
      m.set(mapping.id, arr);
    });
    return m;
  }, [channelMappings]);
  const channelInfoById = useMemo(() => {
    const m = new Map<string, { keys: Set<string>; text: string }>();
    for (const g of games) {
      const resolved = resolveChannels(g.channels, channelMappings);
      const keys = new Set<string>();
      const parts: string[] = [];
      for (const r of resolved) {
        if (r.key) keys.add(r.key);
        parts.push(r.name, r.input, r.key);
        if (r.mapping) {
          for (const k of aliasKeysByMappingId.get(r.mapping.id) ?? []) {
            keys.add(k);
            parts.push(k);
          }
        }
      }
      m.set(g.id, { keys, text: norm(parts.filter(Boolean).join(" ")) });
    }
    return m;
  }, [games, channelMappings, aliasKeysByMappingId]);
  const channelOptions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const g of games) {
      for (const r of resolveChannels(g.channels, channelMappings)) {
        if (!r.key) continue;
        const cur = counts.get(r.key);
        if (cur) cur.count++;
        else counts.set(r.key, { name: r.name, count: 1 });
      }
    }
    return [...counts.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 14);
  }, [games, channelMappings]);

  // Pipeline de filtros: busca → status → canal → esporte
  const filtered = useMemo(() => {
    const q = norm(search);
    // Chave do canal buscado ("ESPN2" → espn2, "Sportv" → sportv, alias "PFC" → premiere)
    const qChannelKey = q ? resolveChannel(search, channelMappings).key : "";
    const qCompact = q.replace(/[^a-z0-9+]/g, "");
    return games.filter((g) => {
      if (!matchesStatus(g, status)) return false;
      const info = channelInfoById.get(g.id);
      if (channel && !(info?.keys.has(channel) ?? false)) return false;
      if (q) {
        const sport = detectedSport(g);
        const hay = norm(
          [g.home_team, g.away_team, g.competition, g.competition_detail, SPORT_LABEL[sport], sport]
            .filter(Boolean)
            .join(" "),
        );
        if (hay.includes(q)) return true;
        if (!info) return false;
        if (qChannelKey && info.keys.has(qChannelKey)) return true;
        if (info.text.includes(q)) return true;
        if (qCompact.length >= 2 && [...info.keys].some((k) => k.includes(qCompact))) return true;
        return false;
      }
      return true;
    });
  }, [games, search, status, channel, matchesStatus, channelInfoById, channelMappings]);

  const grouped = useMemo(() => {
    const out = groupBySport(filtered);
    // Ao vivo primeiro; depois cronológico (encerrados por último)
    for (const arr of Object.values(out)) {
      arr.sort((a, b) => {
        const ra = STATUS_RANK[statusById.get(a.id) ?? "upcoming"];
        const rb = STATUS_RANK[statusById.get(b.id) ?? "upcoming"];
        if (ra !== rb) return ra - rb;
        return a.game_time.localeCompare(b.game_time);
      });
    }
    return out;
  }, [filtered, statusById]);

  const allHighlights = useMemo(() => curateHighlights(games, 6), [games]);
  const highlights = useMemo(() => {
    if (filter === "all" || filter === "live") return allHighlights;
    return allHighlights.filter((h) => detectedSport(h.game) === filter);
  }, [allHighlights, filter]);

  const sportsSorted = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const ia = SPORT_ORDER.indexOf(a as SportType);
      const ib = SPORT_ORDER.indexOf(b as SportType);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }) as SportType[];
  }, [grouped]);

  const countsBySport = useMemo(() => {
    const out: Partial<Record<SportType, number>> = {};
    for (const s of sportsSorted) out[s] = grouped[s].length;
    return out;
  }, [sportsSorted, grouped]);

  const total = games.length;
  const dateObj = midnightInSaoPaulo(date);
  const titleLabel = date === today ? "AGENDA DE HOJE" : date === tomorrow ? "AGENDA DE AMANHÃ" : "AGENDA";
  const subtitle = (() => {
    const d = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });
    return d.charAt(0).toUpperCase() + d.slice(1);
  })();

  const resetFilters = useCallback(() => {
    setFilterState("all");
    setSearch("");
    setStatusState("all");
    setChannelState(null);
  }, []);

  const goToDate = (newDate: string) => {
    if (newDate !== today && newDate !== tomorrow) return;
    const next = new URLSearchParams(params);
    if (newDate === today) next.delete("date");
    else next.set("date", newDate);
    resetFilters();
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (date === tomorrow && !isLoading && total === 0) {
      goToDate(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tomorrow, today, isLoading, total]);

  // Sport chip "live" é redundante com status; mapeia para o status.
  const handleSportFilter = (v: FilterValue) => {
    if (v === "live") {
      setStatus("live");
      setFilter("all");
    } else {
      setFilter(v);
    }
  };

  const visibleSports: SportType[] =
    filter === "all" || filter === "live" ? sportsSorted : [filter];

  const visibleGames = useMemo(
    () =>
      visibleSports
        .flatMap((s) => grouped[s] ?? [])
        .sort((a, b) => a.game_time.localeCompare(b.game_time)),
    [visibleSports, grouped],
  );

  const hasActiveFilters = !!search || status !== "all" || !!channel || filter !== "all";
  const nothingMatches = !isLoading && total > 0 && visibleGames.length === 0;
  // Com filtros ativos, o carrossel sai do caminho para a lista aparecer logo
  const showHighlights = !hasActiveFilters && highlights.length > 0;
  const updatedLabel = useMemo(() => {
    if (!dataUpdatedAt) return "";
    const minutes = Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 60_000));
    return minutes < 1 ? "Atualizado agora" : `Atualizado há ${minutes} min`;
  }, [dataUpdatedAt, tick]);

  return (
    <div className="mx-auto w-full max-w-[460px] md:max-w-[1100px] px-4 md:px-6 pt-4 pb-6 text-white">
      {/* Título + navegação de dias */}
      <div className="mb-4">
        <div className="flex items-end justify-between gap-2">
          <h1
            className="text-[34px] md:text-[48px] leading-[0.9] tracking-tight"
            style={{ fontFamily: "Bebas Neue, sans-serif", color: "#00ff87" }}
          >
            {titleLabel}
          </h1>
          {(isToday ? tomorrowCount > 0 : true) && (
            <nav className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10 shrink-0" aria-label="Trocar dia">
              {isToday ? (
                <button
                  onClick={() => goToDate(tomorrow)}
                  className="inline-flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full hover:bg-white/10 active:scale-95 transition text-[11px] font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
                  aria-label={`Ver programação de amanhã (${tomorrowCount} ${tomorrowCount === 1 ? "jogo" : "jogos"})`}
                >
                  Amanhã
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#00ff87]/15 text-[#00ff87] text-[10px] tabular-nums">
                    {tomorrowCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              ) : (
                <button
                  onClick={() => goToDate(today)}
                  className="inline-flex items-center gap-1 h-9 pl-2 pr-3 rounded-full hover:bg-white/10 active:scale-95 transition text-[11px] font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
                  aria-label="Voltar para hoje"
                >
                  <ChevronLeft className="w-3.5 h-3.5 opacity-70" />
                  Hoje
                </button>
              )}
            </nav>
          )}
        </div>
        <p className="text-[13px] text-white/65 mt-1">
          {subtitle} ·{" "}
          <span className="text-white font-semibold">
            {total} {total === 1 ? "jogo" : "jogos"}
          </span>
          {liveGames.length > 0 && (
            <>
              {" · "}
              <span className="text-[#ff3b3b] font-bold">{liveGames.length} ao vivo</span>
            </>
          )}
          {" · "}
          <span className="text-white/45">Horário de Brasília</span>
        </p>
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2" role="status" aria-live="polite">
          <span className="text-[11px] text-white/55">{updatedLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-11 min-w-11 rounded-full text-white/70 hover:bg-white/10"
            aria-label="Atualizar programação"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
          </Button>
        </div>
      </div>

      {isError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="flex-1 text-xs text-white/85">
            {gamesQuery.data && gamesQuery.data.length > 0
              ? "Não foi possível buscar a atualização. A última programação carregada continua disponível."
              : "A conexão está lenta e a programação não carregou. Tente novamente em instantes."}
          </p>
          <Button type="button" variant="ghost" onClick={() => refetch()} className="min-h-11 px-3 text-xs font-bold text-primary">Tentar novamente</Button>
        </div>
      )}

      {isLoading && <AgendaSkeleton />}

      {!isLoading && total === 0 && (
        <EmptyDayState
          isToday={isToday}
          tomorrowCount={tomorrowCount}
          onSeeTomorrow={isToday && tomorrowCount > 0 ? () => goToDate(tomorrow) : undefined}
        />
      )}

      {!isLoading && total > 0 && (
        <>
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:items-start">
            <div className="min-w-0">
              {isToday && liveGames.length > 0 && <LiveHeroCard games={liveGames} />}

              {isToday && liveGames.length === 0 && (
                <section
                  className="mb-5 rounded-2xl border px-4 py-3.5 flex items-center gap-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(13,13,13,0.6) 100%)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                  aria-label="Sem jogos ao vivo agora"
                >
                  <div
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Radio className="w-4 h-4 text-white/55" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[15px] uppercase tracking-wide leading-none text-white/85"
                      style={{ fontFamily: "Bebas Neue, sans-serif" }}
                    >
                      Sem jogos ao vivo agora
                    </p>
                    {allHighlights.length > 0 ? (
                      <p className="text-[12px] text-white/55 mt-1.5 flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 shrink-0" />
                        Próximo:{" "}
                        <span className="text-white/85 font-semibold tabular-nums">
                          {allHighlights[0].game.game_time.slice(0, 5)}
                        </span>
                        <span className="truncate">
                          · {allHighlights[0].game.away_team
                            ? `${allHighlights[0].game.home_team} × ${allHighlights[0].game.away_team}`
                            : allHighlights[0].game.home_team}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-white/50 mt-1.5">Confira a programação completa abaixo.</p>
                    )}
                  </div>
                </section>
              )}
            </div>
            <div className="min-w-0">
              {showHighlights && <HighlightsCarousel highlights={highlights} />}
            </div>
          </div>

          <ScheduleToolbar
            search={search}
            onSearch={setSearch}
            status={status}
            onStatus={setStatus}
            statusCounts={statusCounts}
            sort={sort}
            onSort={setSort}
            channels={channelOptions.map((c) => ({ name: c.name, count: c.count, key: c.key }))}
            channel={channel}
            onChannel={setChannel}
          />

          {(sportsSorted.length > 1 || filter !== "all") && (
            <SportFilterBar
              active={filter}
              onChange={handleSportFilter}
              totalCount={filtered.length}
              liveCount={0}
              countsBySport={countsBySport}
              sportOrder={sportsSorted}
            />
          )}

          {sort === "sport"
            ? visibleSports.map((sport) => (
                <SportSection key={sport} sport={sport} games={grouped[sport] ?? []} />
              ))
            : <TimeSection games={visibleGames} statusById={isToday ? statusById : undefined} />}

          {nothingMatches && (
            <div
              className="text-center py-12 px-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] md:max-w-[560px] md:mx-auto"
              role="status"
            >
              <SearchX className="w-8 h-8 mx-auto mb-3 text-white/45" aria-hidden />
              <p className="text-white/85 text-[15px] font-semibold">Nenhum jogo encontrado para esse filtro.</p>
              <p className="text-white/55 text-[12.5px] mt-1">
                {status === "live"
                  ? "Nenhum jogo ao vivo neste momento."
                  : status === "soon"
                    ? "Nenhum jogo ainda por começar hoje."
                    : status === "ended"
                      ? "Nenhum jogo encerrado até agora."
                      : "Tente outro termo, canal ou esporte."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-4 min-h-11 px-5 rounded-full bg-[#00ff87] text-[#07080a] text-sm font-bold active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          <p className="text-center text-[11px] text-white/45 mt-4 mb-4">
            Todos os horários no Horário de Brasília (GMT-3)
          </p>

          <div className="mt-4 mb-2 md:max-w-[560px] md:mx-auto">
            <PremiumCTA from="programacao-bottom" />
          </div>
        </>
      )}

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ProgramacaoTab;
