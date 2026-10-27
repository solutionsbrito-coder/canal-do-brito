import { useState } from "react";
import { Bell, BellRing, CalendarPlus, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import type { DailyGame } from "@/hooks/useDailyGames";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useRemindedGames } from "@/hooks/useRemindedGames";
import { useMeuCanal } from "@/hooks/useMeuCanal";
import { isCompetitionFollowed, isSportFollowed, isTeamFollowed } from "@/lib/meuCanal";
import { getMinutesUntilStart, isGameCurrentlyLive, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import { detectedSport } from "@/components/agenda/public/highlightsCuration";
import { downloadGameIcs } from "@/lib/ics";

interface GameActionsProps {
  game: DailyGame;
  /** Seguir time/esporte: falso na prévia do admin, para não gravar follows de teste. */
  showFollow?: boolean;
}

/**
 * Ações públicas de UM jogo, todas SEM login:
 * - Sino "Me avise 15 min antes": usa o push anônimo já existente
 *   (inscrição por endpoint, RPCs add/remove_push_game_id). A Edge
 *   Function send-push-notifications já dispara ~15 min antes.
 *   Exige chave VAPID configurada em settings; sem ela, o sino avisa
 *   e não marca nada.
 * - "Adicionar à agenda": baixa um .ics do jogo (calendário do visitante).
 * - "Seguir": grava o follow só neste dispositivo (localStorage).
 *
 * Sino e ICS aparecem só para jogos que ainda vão começar. Jogos ao
 * vivo ou encerrados não têm o que lembrar/adicionar.
 */
export const GameActions = ({ game, showFollow = true }: GameActionsProps) => {
  const { addGameReminder, removeGameReminder, isSupported: pushSupported } = usePushSubscription();
  const { reminded, markReminded, unmarkReminded } = useRemindedGames();
  const { prefs, toggleTeam, toggleSport, toggleCompetition } = useMeuCanal();
  const [busy, setBusy] = useState(false);

  const sport = detectedSport(game);
  const minutesUntil = getMinutesUntilStart(game.game_time, game.date);
  const live = isGameCurrentlyLive(game.game_time, game.date, sport as SportType);
  const upcoming = !live && minutesUntil !== null && minutesUntil > 0;
  const isReminded = reminded.has(game.id);

  const handleBell = async () => {
    if (busy) return;
    if (!pushSupported) {
      toast.error("Este navegador não suporta notificações push. Use a agenda (.ics) abaixo.");
      return;
    }
    setBusy(true);
    try {
      if (isReminded) {
        await removeGameReminder(game.id);
        unmarkReminded(game.id);
        toast.info("Lembrete removido.");
      } else {
        const ok = await addGameReminder(game.id);
        if (!ok) {
          toast.error("Não foi possível ativar o lembrete. Verifique se as notificações estão liberadas.");
          return;
        }
        markReminded(game.id);
        toast.success("Você será avisado 15 min antes!");
      }
    } finally {
      setBusy(false);
    }
  };

  const followTargets: { label: string; followed: boolean; toggle: () => void }[] = [];
  if (showFollow) {
    const homeFollowed = isTeamFollowed(prefs, game.home_team);
    followTargets.push({ label: game.home_team, followed: homeFollowed, toggle: () => toggleTeam(game.home_team) });
    if (game.away_team && game.away_team !== game.home_team) {
      const awayFollowed = isTeamFollowed(prefs, game.away_team);
      followTargets.push({ label: game.away_team, followed: awayFollowed, toggle: () => toggleTeam(game.away_team) });
    }
    const sportFollowed = isSportFollowed(prefs, sport);
    followTargets.push({
      label: SPORT_LABEL[sport] ?? sport,
      followed: sportFollowed,
      toggle: () => toggleSport(sport),
    });
    if (game.competition) {
      const compFollowed = isCompetitionFollowed(prefs, game.competition);
      followTargets.push({
        label: game.competition,
        followed: compFollowed,
        toggle: () => toggleCompetition(game.competition),
      });
    }
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {upcoming && (
        <button
          type="button"
          onClick={handleBell}
          disabled={busy}
          aria-label={isReminded ? `Remover lembrete de ${game.home_team}` : `Me avise 15 min antes de ${game.home_team}`}
          aria-pressed={isReminded}
          className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-[11px] font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
            isReminded
              ? "bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40"
              : "bg-white/[0.06] text-white/80 border border-white/10 hover:bg-white/10"
          }`}
        >
          {isReminded ? <BellRing className="h-3.5 w-3.5" aria-hidden /> : <Bell className="h-3.5 w-3.5" aria-hidden />}
          {isReminded ? "Lembrete ativo" : "Me avise 15 min antes"}
        </button>
      )}
      {upcoming && (
        <button
          type="button"
          onClick={() => downloadGameIcs(game)}
          aria-label={`Adicionar ${game.home_team} à agenda`}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-[11px] font-bold bg-white/[0.06] text-white/80 border border-white/10 hover:bg-white/10 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          Adicionar à agenda
        </button>
      )}
      {followTargets.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.toggle}
          aria-label={`${t.followed ? "Deixar de seguir" : "Seguir"} ${t.label}`}
          aria-pressed={t.followed}
          title={t.followed ? `Você segue ${t.label} neste dispositivo` : `Seguir ${t.label} neste dispositivo`}
          className={`inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-full text-[11px] font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
            t.followed
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-white/60 border border-white/10 hover:text-white/85 hover:bg-white/5"
          }`}
        >
          {t.followed ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : <Plus className="h-3 w-3 shrink-0" aria-hidden />}
          {/* Texto completo "Seguir X" (não só "X") para não duplicar o
              nome do time já exibido no corpo do card. */}
          <span className="max-w-[160px] truncate">{t.followed ? "Seguindo" : "Seguir"} {t.label}</span>
        </button>
      ))}
      {!upcoming && !showFollow && null}
    </div>
  );
};
