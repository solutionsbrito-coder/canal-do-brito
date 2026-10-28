import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import {
  NotificationPermissionDialogs,
  type NotificationDialogKind,
} from "@/components/public/NotificationPermissionDialogs";

/**
 * Botão global "Ativar notificações" — fora do sino de um jogo.
 *
 * Fica na aba Meu Canal, o espaço pessoal do visitante (preferências
 * do dispositivo, sem login — o mesmo modelo mental da inscrição
 * push, que também é do aparelho, não de uma conta). O visitante
 * leigo libera uma única vez, fora da pressa de um jogo específico,
 * e depois usa o sino normalmente nos jogos.
 *
 * O que ele faz — e o que ele NÃO promete:
 * - Só cria a inscrição push do aparelho (endpoint + chaves, via o
 *   mesmo fluxo do sino). Não marca lembrete de nenhum jogo: os
 *   lembretes continuam sendo por jogo, no sino de cada card.
 * - Reutiliza os mesmos diálogos do sino (aviso pré-permissão e
 *   ajuda quando negada), sem um segundo fluxo de permissão: com a
 *   permissão negada, NÃO chama requestPermission de novo — abre a
 *   ajuda com o passo a passo por contexto e o botão "Tentar de
 *   novo" (que releitura a permissão atual).
 */
export const GlobalNotificationToggle = () => {
  const {
    permission,
    refreshPermission,
    settingsLoading,
    subscription,
    subscribeDevice,
    isSupported: pushSupported,
  } = usePushSubscription();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<NotificationDialogKind | null>(null);

  // Permissão concedida + inscrição existente: nada a pedir de novo.
  const isActive = permission === "granted" && subscription !== null;

  const attemptSubscribe = async () => {
    setBusy(true);
    try {
      const result = await subscribeDevice();
      if (result.ok) {
        toast.success(
          "Notificações ativas neste aparelho! Agora marque os jogos com o sino para ser avisado 15 min antes."
        );
      } else if (result.reason === "permission-denied") {
        setDialog("help-denied");
      } else if (result.reason === "no-vapid") {
        toast.error("Notificações indisponíveis no momento (configuração do site).");
      } else if (result.reason === "unsupported") {
        toast.error("Este navegador não suporta notificações push.");
      } else {
        toast.error("Não foi possível concluir a inscrição de notificações. Tente de novo.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClick = async () => {
    // Settings ainda carregando: a chave VAPID pode nem ter chegado
    // ao hook — o botão já está desabilitado nesse estado, mas o
    // guarda impede qualquer toque que escape (teclado, leitor).
    if (busy || settingsLoading) return;
    if (!pushSupported) {
      toast.error("Este navegador não suporta notificações push.");
      return;
    }
    if (isActive) return;
    // Releitura fresca: o visitante pode ter liberado a permissão
    // nas configurações do aparelho desde a última visita.
    const current = refreshPermission ? refreshPermission() : permission;
    if (current === "denied") {
      // Não pedir de novo: o sistema não pergunta outra vez.
      setDialog("help-denied");
      return;
    }
    if (current === "default") {
      setDialog("pre-permission");
      return;
    }
    // Já concedida, mas sem inscrição (ex.: liberou nas
    // configurações sem nunca ter ativado): inscreve direto.
    await attemptSubscribe();
  };

  const handleRetryFromHelp = async () => {
    const current = refreshPermission ? refreshPermission() : permission;
    if (current === "granted") {
      setDialog(null);
      await attemptSubscribe();
    } else if (current === "default") {
      setDialog("pre-permission");
    }
    // Ainda "denied": o diálogo fica aberto com o passo a passo.
  };

  return (
    <section className="mt-4 space-y-2" aria-label="Notificações">
      <h2 className="text-[12px] font-bold uppercase tracking-wider text-white/70">
        Notificações
      </h2>
      <p className="text-[12.5px] leading-relaxed text-white/65">
        Ative uma vez neste aparelho para poder usar o sino nos jogos. Isso só
        libera o aparelho — os lembretes continuam sendo marcados jogo por
        jogo, no sino de cada card.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || isActive || !pushSupported || settingsLoading}
        aria-label={
          isActive
            ? "Notificações ativas neste aparelho"
            : settingsLoading
              ? "Carregando notificações"
              : "Ativar notificações neste aparelho"
        }
        aria-pressed={isActive}
        className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full text-[12px] font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
          isActive
            ? "bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40"
            : "bg-white/[0.06] text-white/80 border border-white/10 hover:bg-white/10"
        } disabled:opacity-60`}
      >
        {isActive ? (
          <BellRing className="h-4 w-4" aria-hidden />
        ) : (
          <Bell className="h-4 w-4" aria-hidden />
        )}
        {isActive
          ? "Notificações ativas"
          : settingsLoading
            ? "Carregando..."
            : !pushSupported
              ? "Notificações não suportadas neste navegador"
              : "Ativar notificações"}
      </button>
      {!pushSupported && (
        <p className="text-[12px] text-white/55">
          Este navegador não suporta notificações push. Nos jogos, use
          “Adicionar à agenda” para ser lembrado.
        </p>
      )}
      <NotificationPermissionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onConfirmPrePermission={async () => {
          setDialog(null);
          await attemptSubscribe();
        }}
        onRetryFromHelp={handleRetryFromHelp}
        prePermissionBody={
          <>
            Vamos pedir permissão para te avisar 15 minutos antes dos jogos
            que você marcar com o sino. Na pergunta do aparelho, toque em{" "}
            <strong>Permitir</strong> — sem isso o sino não consegue te
            avisar.
          </>
        }
        prePermissionConfirmLabel="Permitir notificações"
        helpIntro={
          <>
            A permissão está negada neste aparelho, e o sistema não pergunta
            de novo sozinho. Atenção: são duas permissões diferentes —
            ligar “Notificações” nas Informações do app sozinho não destrava
            o sino. O que falta liberar é a permissão do site no Chrome
            (veja os passos abaixo). Depois de permitir, feche o app por
            completo e abra de novo antes de ativar de novo.
          </>
        }
      />
    </section>
  );
};
