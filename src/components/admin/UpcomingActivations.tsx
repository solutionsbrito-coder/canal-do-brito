import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCountdown } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Clock, Image, Trophy, Loader2 } from "lucide-react";
import { useState, useEffect, forwardRef } from "react";

interface ScheduledItem {
  id: string;
  type: "banner" | "game";
  label: string;
  publish_at: string;
  category?: string;
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
          .select("id, home_team, away_team, date, publish_at")
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
        {items.map((item) => (
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
              <p className="text-[10px] text-muted-foreground">
                {new Date(item.publish_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0 shrink-0">
              {formatCountdown(item.publish_at)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
});

UpcomingActivations.displayName = "UpcomingActivations";
