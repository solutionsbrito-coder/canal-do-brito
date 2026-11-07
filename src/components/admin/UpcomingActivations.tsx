import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCountdown } from "@/lib/dateUtils";
import {
  formatEffectiveGameDateTime,
  formatShortDateTime,
  isDawnGame,
} from "@/lib/gameUtils";
import { Badge } from "@/components/ui/badge";
import { Clock, Image, Trophy, Loader2 } from "lucide-react";
import { useState, useEffect, forwardRef } from "react";

interface ScheduledItem {
  id: string;
  type: "banner" | "game";
  label: string;
  publish_at: string;
  category?: string;
  /** Games only: programming day + clock time, for the effective game instant. */
  gameDate?: string;
  gameTime?: string;
}

/**
 * Lines shown for a scheduled game: the EFFECTIVE game instant (sports-day
 * rule — a 00:00 game on 07/11 happens 08/11 00:00) and, separately labeled,
 * the publish instant. The old UI showed only publish_at ("07/11, 00:00"),
 * which every game shares and which is not the game time.
 */
export function formatGameActivation(game: {
  date: string;
  game_time: string;
  publish_at: string;
}): { gameLine: string; publishLine: string; isDawn: boolean } {
  const dawn = isDawnGame(game.game_time);
  return {
    gameLine: `Jogo ${formatEffectiveGameDateTime(game.date, game.game_time)}${dawn ? " · fim do dia" : ""}`,
    publishLine: `Publica ${formatShortDateTime(new Date(game.publish_at))}`,
    isDawn: dawn,
  };
}

const useScheduledItems = () =>
  useQuery({
    queryKey: ["scheduled_items"],
    queryFn: async () => {
      const items: ScheduledItem[] = [];

      const [bannersRes, gamesRes] = await Promise.all([
        supabase
          .from("banners")
          .select("id, category, title, publish_at")
          .eq("active", false)
          .not("publish_at", "is", null)
          .order("publish_at", { ascending: true }),
        supabase
          .from("daily_games")
          .select("id, home_team, away_team, date, game_time, publish_at")
          .eq("active", false)
          .not("publish_at", "is", null)
          .order("publish_at", { ascending: true }),
      ]);

      if (bannersRes.data) {
        for (const b of bannersRes.data) {
          if (b.publish_at && new Date(b.publish_at) > new Date()) {
            items.push({
              id: b.id,
              type: "banner",
              label: b.title || `Banner ${b.category}`,
              publish_at: b.publish_at,
              category: b.category,
            });
          }
        }
      }

      if (gamesRes.data) {
        for (const g of gamesRes.data) {
          if (g.publish_at && new Date(g.publish_at) > new Date()) {
            items.push({
              id: g.id,
              type: "game",
              label: `${g.home_team} x ${g.away_team}`,
              publish_at: g.publish_at,
              gameDate: g.date,
              gameTime: g.game_time,
            });
          }
        }
      }

      items.sort((a, b) => new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime());
      return items;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 60_000,
  });

export const UpcomingActivations = forwardRef<HTMLDivElement>((_props, ref) => {
  const { data: items, isLoading } = useScheduledItems();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div ref={ref} className="glass-panel rounded-xl p-4 border border-amber-500/[0.15]">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold text-foreground">Próximas Ativações</h3>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div ref={ref} className="glass-panel rounded-xl overflow-hidden border border-amber-500/[0.15] bg-gradient-to-br from-amber-500/[0.06] to-amber-500/[0.01]">
      <div className="p-4 border-b border-amber-500/10">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold text-foreground">Próximas Ativações</h3>
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0 ml-auto">
            {items.length} pendente{items.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>
      <div className="p-3 space-y-2 max-h-64 overflow-y-auto scrollbar-none">
        {items.map((item) => {
          // Games show the EFFECTIVE game instant first (sports-day rule) and
          // the publish instant labeled separately — publish_at alone ("07/11,
          // 00:00") is shared by every game and is not the game time.
          const gameLines =
            item.type === "game" && item.gameDate && item.gameTime
              ? formatGameActivation({
                  date: item.gameDate,
                  game_time: item.gameTime,
                  publish_at: item.publish_at,
                })
              : null;
          return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg glass-panel p-2.5"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
              {item.type === "banner" ? (
                <Image className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">
                {item.label}
              </p>
              {gameLines ? (
                <>
                  <p className="text-[10px] font-semibold text-foreground">
                    {gameLines.isDawn ? "🌙 " : ""}
                    {gameLines.gameLine}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {gameLines.publishLine}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Publica {formatShortDateTime(new Date(item.publish_at))}
                </p>
              )}
            </div>
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0 shrink-0">
              {formatCountdown(item.publish_at)}
            </Badge>
          </div>
          );
        })}
      </div>
    </div>
  );
});

UpcomingActivations.displayName = "UpcomingActivations";
