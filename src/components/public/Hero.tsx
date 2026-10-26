import { useDailyGames } from "@/hooks/useDailyGames";
import { getLocalDateString, isGameCurrentlyLive, type SportType } from "@/lib/gameUtils";
import { useMemo } from "react";
import { useLiveTick } from "@/hooks/useLiveTick";

export const Hero = () => {
  const dateStr = getLocalDateString();
  const { data: games } = useDailyGames(dateStr);
  const tick = useLiveTick();
  // Static counts (channels + total) only depend on `games`
  const baseStats = useMemo(() => {
    const allGames = games || [];
    const channels = new Set<string>();
    allGames.forEach((g) => g.channels?.forEach((c) => channels.add(c)));
    return { tonight: allGames.length, channels: channels.size };
  }, [games]);

  // Live count needs to re-evaluate as time passes
  const liveCount = useMemo(() => {
    const allGames = games || [];
    return allGames.filter((g) => {
      const st = (g.sport_type || "football") as SportType;
      return isGameCurrentlyLive(g.game_time, g.date, st);
    }).length;
  }, [games, tick]);

  const stats = { live: liveCount, ...baseStats };

  return (
    <section className="px-4 py-5 animate-fade-up stagger-1">
      <div className="space-y-4">
        {/* Welcome + Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-green-dim border border-green-border px-3 py-1 min-h-[44px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-live" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary font-body">
              {stats.live > 0 ? "Ao vivo agora" : "Bem-vindo"}
            </span>
          </div>

          <h2
            className="font-bold leading-[1.1] tracking-tight font-body"
            style={{ fontSize: "clamp(1.4rem, 5vw, 2.125rem)", letterSpacing: "-0.8px" }}
          >
            O que vai{" "}
            <span className="text-primary">assistir</span>{" "}
            <span className="text-foreground/30">hoje?</span>
          </h2>

          <p className="text-[11px] sm:text-xs text-muted-foreground font-body">
            Esportes ao vivo, filmes e séries — tudo num só lugar.
          </p>
        </div>

        {/* Stats bar */}
        <div className="rounded-xl bg-surface border border-border overflow-hidden" role="group" aria-label="Estatísticas de hoje">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="px-3 py-2.5 text-center">
              <p className="text-base sm:text-lg font-bold text-primary font-body tabular-nums">{stats.live}</p>
              <p className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground font-body">Ao vivo</p>
            </div>
            <div className="px-3 py-2.5 text-center">
              <p className="text-base sm:text-lg font-bold text-foreground font-body tabular-nums">{stats.tonight}</p>
              <p className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground font-body">Hoje</p>
            </div>
            <div className="px-3 py-2.5 text-center">
              <p className="text-base sm:text-lg font-bold text-foreground font-body tabular-nums">{stats.channels}</p>
              <p className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground font-body">Canais</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
