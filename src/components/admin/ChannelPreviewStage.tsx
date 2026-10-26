import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChannelBadge } from "@/components/public/ChannelBadge";
import { GameCard } from "@/components/public/schedule/GameCard";
import type { DailyGame } from "@/hooks/useDailyGames";
import { Clock } from "lucide-react";

interface Props {
  /** Optional initial channel preselected (e.g. when "Ver na programação" is clicked) */
  initialChannel?: string;
  /** Controlled value (preferred). If provided, ChannelPreviewStage will reflect this value. */
  value?: string;
  /** onChange for controlled mode. */
  onChange?: (next: string) => void;
}

const today = new Date().toISOString().slice(0, 10);

const buildMockGame = (channels: string[]): DailyGame => ({
  id: "preview-mock",
  date: today,
  home_team: "Flamengo",
  away_team: "Palmeiras",
  competition: "Brasileirão",
  competition_detail: "Rodada 28",
  game_time: "21:30:00",
  channels,
  is_live: false,
  is_womens: false,
  active: true,
  archived: false,
  status_short: "NS",
  elapsed_minutes: null,
  publish_at: null,
  sport_type: "football",
  created_at: new Date().toISOString(),
});

export function ChannelPreviewStage({ initialChannel = "", value, onChange }: Props) {
  const [internalChannel, setInternalChannel] = useState(initialChannel);
  const channel = value !== undefined ? value : internalChannel;
  const setChannel = (v: string) => {
    if (onChange) onChange(v);
    else setInternalChannel(v);
  };
  const [extra, setExtra] = useState("");
  const channels = [channel, extra].map((c) => c.trim()).filter(Boolean);
  const mockGame = buildMockGame(channels.length ? channels : ["Canal Exemplo"]);

  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-display text-base font-bold">Como vai aparecer</h3>
          <p className="text-xs text-muted-foreground">
            Visualize o canal no chip, no card de programação e no carrossel ao vivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Canal principal
          </label>
          <Input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Ex: SporTV"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Canal adicional (opcional)
          </label>
          <Input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Ex: Premiere"
          />
        </div>
      </div>

      <Tabs defaultValue="chip" className="mt-2">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="chip">Chip puro</TabsTrigger>
          <TabsTrigger value="schedule">Programação</TabsTrigger>
          <TabsTrigger value="live">Ao vivo</TabsTrigger>
        </TabsList>

        <TabsContent value="chip" className="mt-3">
          <div className="rounded-md border border-border/30 bg-background/60 p-4 flex flex-wrap items-center gap-3">
            {channels.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Digite um nome de canal acima.
              </span>
            ) : (
              channels.map((c) => (
                <div key={c} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{c}</span>
                  <div className="flex items-center gap-2">
                    <ChannelBadge name={c} size="sm" />
                    <ChannelBadge name={c} size="md" />
                    <ChannelBadge name={c} size="lg" />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-3">
          <div className="rounded-md border border-border/30 bg-background/60 p-4 max-w-sm mx-auto">
            <GameCard game={mockGame} index={0} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Card real da Programação com canal injetado.
          </p>
        </TabsContent>

        <TabsContent value="live" className="mt-3">
          <div className="rounded-md border border-border/30 bg-background/60 p-4">
            <div className="rounded-xl overflow-hidden border border-destructive/30 bg-card/40 max-w-sm mx-auto">
              <div className="bg-gradient-to-r from-destructive/30 to-destructive/10 px-3 py-1.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-destructive">
                  Ao vivo
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {mockGame.competition}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-extrabold text-foreground flex-1 text-left">
                    {mockGame.home_team}
                  </p>
                  <span className="text-[11px] font-extrabold text-destructive px-2 py-1 rounded-lg bg-destructive/15 border border-destructive/30">
                    VS
                  </span>
                  <p className="text-[13px] font-extrabold text-foreground flex-1 text-right">
                    {mockGame.away_team}
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-2 flex items-center justify-between gap-2 bg-muted/20 border-t border-border/30">
                <div className="flex items-center gap-1 text-muted-foreground/70">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] font-medium tabular-nums">
                    {mockGame.game_time.slice(0, 5)}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {channels.length === 0 ? (
                    <span className="text-[9px] text-muted-foreground/60">
                      Sem canal selecionado
                    </span>
                  ) : (
                    channels.map((c) => <ChannelBadge key={c} name={c} size="sm" />)
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
