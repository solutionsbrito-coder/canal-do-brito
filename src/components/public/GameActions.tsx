import { useState } from "react";
import { Bell, BellRing, CalendarPlus, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { DailyGame } from "@/hooks/useDailyGames";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useRemindedGames } from "@/hooks/useRemindedGames";
import { useMeuCanal } from "@/hooks/useMeuCanal";
import { isCompetitionFollowed, isSportFollowed, isTeamFollowed } from "@/lib/meuCanal";
import { getMinutesUntilStart, isGameCurrentlyLive, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import { detectedSport } from "@/components/agenda/public/highlightsCuration";
import { downloadGameIcs } from "@/lib/ics";
import {
  NotificationPermissionDialogs,
  type NotificationDialogKind,
} from "@/components/public/NotificationPermissionDialogs";
import { renderGameSharePng } from "@/lib/shareCard";
import { ShareCardButton } from "@/components/public/ShareCardButton";

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
 *
 * Ajuda de permissão do sino (não voltar ao erro genérico):
 * - Permissão "default": antes do pedido do sistema, um aviso do
 *   próprio site explica o que vai acontecer, para o visitante não
 *   negar no susto. Só o botão "Permitir" do aviso chama o pedido.
 * - Permissão "denied": o sistema não pergunta outra vez, então o
 *   sino NÃO chama requestPermission de novo — abre o diálogo de
 *   ajuda com o passo a passo do contexto (PWA Android, Chrome,
 *   iPhone ou outro), botão "Tentar de novo" (releitura da permissão)
 *   e a alternativa .ics, que não precisa de permissão.
 * - Outras causas (sem VAPID, sem suporte, erro de inscrição ou de
 *   banco) têm mensagens próprias e honestas — nunca "verifique se
 *   as notificações estão liberadas" quando a permissão não é o
 *   problema.
 */
export const GameActions = ({ game, showFollow = true }: GameActionsProps) => {
  const {
    addGameReminderWithReason,
    removeGameReminder,
    isSupported: pushSupported,
    permission,
    refreshPermission,
  } = usePushSubscription();
  const { reminded, markReminded, unmarkReminded } = useRemindedGames();
  const { prefs, toggleTeam, toggleSport, toggleCompetition } = useMeuCanal();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<NotificationDialogKind | null>(null);

  const sport = detectedSport(game);
  const minutesUntil = getMinutesUntilStart(game.game_time, game.date);
  const live = isGameCurrentlyLive(game.game_time, game.date, sport as SportType);
  const upcoming = !live && minutesUntil !== null && minutesUntil > 0;
  const isReminded = reminded.has(game.id);

  const attemptReminder = async () => {
    setBusy(true);
    try {
      const result = await addGameReminderWithReason(game.id);
      if (result.ok) {
        markReminded(game.id);
        toast.success("Você será avisado 15 min antes!");
      } else if (result.reason === "permission-denied") {
        setDialog("help-denied");
      } else if (result.reason === "no-vapid") {
        toast.error("Lembretes indisponíveis no momento (configuração do site). Use “Adicionar à agenda”.");
      } else if (result.reason === "unsupported") {
        toast.error("Este navegador não suporta notificações push. Use a agenda (.ics) abaixo.");
      } else if (result.reason === "subscribe-error") {
        toast.error("Não foi possível concluir a inscrição de notificações. Tente de novo.");
      } else {
        toast.error("Não foi possível salvar o lembrete. Tente de novo em instantes.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBell = async () => {
    if (busy) return;
    if (!pushSupported) {
      toast.error("Este navegador não suporta notificações push. Use a agenda (.ics) abaixo.");
      return;
    }
    // Releitura fresca: o visitante pode ter liberado a permissão
    // nas configurações do aparelho desde a última visita.
    const current = refreshPermission ? refreshPermission() : permission;
    if (isReminded) {
      setBusy(true);
      try {
        await removeGameReminder(game.id);
        unmarkReminded(game.id);
        toast.info("Lembrete removido.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (current === "denied") {
      // Não pedir de novo: o sistema não pergunta outra vez.
      setDialog("help-denied");
      return;
    }
    if (current === "default") {
      setDialog("pre-permission");
      return;
    }
    await attemptReminder();
  };

  const handleRetryFromHelp = async () => {
    const current = refreshPermission ? refreshPermission() : permission;
    if (current === "granted") {
      setDialog(null);
      await attemptReminder();
    } else if (current === "default") {
      setDialog("pre-permission");
    }
    // Ainda "denied": o diálogo fica aberto com o passo a passo.
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
      {(upcoming || live) && (
        <ShareCardButton
          label="Compartilhar como imagem"
          filename={`canal-do-brito-${game.id}.png`}
          render={() =>
            renderGameSharePng({
              home_team: game.home_team,
              away_team: game.away_team || null,
              date: game.date,
              game_time: game.game_time,
              competition: game.competition,
              channelsText: (game.channels ?? []).join(" • "),
            })
          }
        />
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

      <NotificationPermissionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onConfirmPrePermission={async () => {
          setDialog(null);
          await attemptReminder();
        }}
        onRetryFromHelp={handleRetryFromHelp}
        helpFooter={
          <button
            type="button"
            onClick={() => {
              downloadGameIcs(game);
              setDialog(null);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/15 px-4 text-sm font-bold text-white/80 hover:bg-white/10 transition active:scale-95"
          >
            Adicionar à agenda (.ics)
          </button>
        }
      />
    </div>
  );
};
