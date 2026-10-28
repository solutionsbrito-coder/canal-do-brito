import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  detectNotificationContext,
  orderedNotificationHelpSections,
} from "@/lib/notificationHelp";

export type NotificationDialogKind = "pre-permission" | "help-denied";

interface NotificationPermissionDialogsProps {
  /** null = nenhum diálogo aberto. */
  dialog: NotificationDialogKind | null;
  onClose: () => void;
  /** Confirmar o aviso pré-permissão (quem chama faz o pedido/inscrição). */
  onConfirmPrePermission: () => void;
  /** "Tentar de novo" do diálogo de ajuda (quem chama releitura e decide). */
  onRetryFromHelp: () => void;
  /** Texto do aviso pré-permissão. Padrão = texto do sino de um jogo. */
  prePermissionBody?: ReactNode;
  prePermissionConfirmLabel?: string;
  /** Texto de introdução do diálogo de ajuda. Padrão = texto do sino. */
  helpIntro?: ReactNode;
  /** Botão extra no rodapé da ajuda (ex.: .ics de um jogo). Global: nenhum. */
  helpFooter?: ReactNode;
}

const DEFAULT_PRE_PERMISSION_BODY = (
  <>
    Vamos pedir permissão para te avisar 15 minutos antes deste jogo. Na
    pergunta do aparelho, toque em <strong>Permitir</strong> — sem isso o
    sino não consegue te avisar.
  </>
);

const DEFAULT_HELP_INTRO = (
  <>
    A permissão está negada neste aparelho, e o sistema não pergunta de
    novo sozinho. Atenção: são duas permissões diferentes — ligar
    “Notificações” nas Informações do app sozinho não destrava o sino. O
    que falta liberar é a permissão do site no Chrome (veja os passos
    abaixo). Depois de permitir, feche o app por completo e abra de
    novo antes de tocar no sino.
  </>
);

/**
 * Os dois diálogos de permissão de notificação, compartilhados pelo
 * sino de um jogo (GameActions) e pelo botão global (Meu Canal).
 *
 * Um único fluxo, sem duplicar: o diálogo em si não pede permissão
 * nem inscreve ninguém — quem chama decide o que fazer no confirmar
 * e no "Tentar de novo". Com a permissão já negada, nenhum dos dois
 * chama requestPermission() de novo: o sistema não pergunta outra
 * vez, só o passo a passo das configurações resolve.
 */
export const NotificationPermissionDialogs = ({
  dialog,
  onClose,
  onConfirmPrePermission,
  onRetryFromHelp,
  prePermissionBody = DEFAULT_PRE_PERMISSION_BODY,
  prePermissionConfirmLabel = "Permitir e ativar o lembrete",
  helpIntro = DEFAULT_HELP_INTRO,
  helpFooter,
}: NotificationPermissionDialogsProps) => {
  if (dialog === null) return null;

  const helpSections = orderedNotificationHelpSections(detectNotificationContext());
  const [firstHelp, ...otherHelp] = helpSections;

  const closeButton = (
    <button
      type="button"
      aria-label="Fechar"
      onClick={onClose}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 hover:bg-white/10"
    >
      <X className="h-5 w-5" aria-hidden />
    </button>
  );

  if (dialog === "pre-permission") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ativar lembrete"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121417] p-5 text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold">Ativar lembrete</h3>
            {closeButton}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{prePermissionBody}</p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirmPrePermission}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#00ff87] px-4 text-sm font-bold text-black transition active:scale-95"
            >
              {prePermissionConfirmLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/15 px-4 text-sm font-bold text-white/80 hover:bg-white/10 transition active:scale-95"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notificações bloqueadas: como liberar"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#121417] p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold">Notificações bloqueadas</h3>
          {closeButton}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{helpIntro}</p>
        <div className="mt-4">
          <h4 className="text-sm font-bold text-[#00ff87]">{firstHelp.title}</h4>
          <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/80">
            {firstHelp.steps.map((step, i) => (
              <li key={i}>
                <span className="font-bold text-white">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
          {otherHelp.map((section) => (
            <details key={section.context} className="mt-3 rounded-xl border border-white/10 p-3">
              <summary className="cursor-pointer text-sm font-bold text-white/85">
                {section.title}
              </summary>
              <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/80">
                {section.steps.map((step, i) => (
                  <li key={i}>
                    <span className="font-bold text-white">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetryFromHelp}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#00ff87] px-4 text-sm font-bold text-black transition active:scale-95"
          >
            Tentar de novo
          </button>
          {helpFooter}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-bold text-white/60 hover:bg-white/10 transition active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
