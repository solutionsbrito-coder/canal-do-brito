/**
 * Passo a passo de liberação de notificações, por contexto.
 *
 * Por que isso existe: quando a permissão já foi negada, o sistema
 * NÃO pergunta de novo — tocar no sino e pedir outra vez não faz
 * nada. E no PWA instalado não há barra de endereço nem cadeado,
 * então o caminho "clicar no cadeado e permitir" simplesmente não
 * existe na tela. Sem este passo a passo, o visitante leigo fica
 * preso no erro e o sino parece quebrado (foi o que aconteceu no
 * teste real de 2026-10-28, no PWA Android).
 *
 * DUAS CAMADAS, NÃO CONFUNDIR (diagnóstico real de 2026-10-28):
 * ligar "Notificações" nas Informações do app instalado (CanalBrito,
 * "Permitido") NÃO destrava o sino. São permissões diferentes:
 * (1) o interruptor do app no Android e (2) a permissão do SITE
 * (Notification.permission) na origem canaldobrito.site, que só se
 * muda nas configurações do site no Chrome. Por isso o caminho
 * principal no Android é sempre o do Chrome, e liberar no app
 * sozinho nunca é apresentado como suficiente. Reinstalar o PWA
 * também não é apresentado como reset garantido da permissão do
 * site — ela sobrevive à reinstalação do atalho.
 *
 * A detecção é só uma pista de qual seção mostrar primeiro: todas
 * as seções ficam disponíveis no diálogo, para o caso de a detecção
 * errar.
 */

export type NotificationContext =
  | "pwa-android"
  | "chrome-android"
  | "ios"
  | "other";

export interface NotificationHelpSection {
  context: NotificationContext;
  title: string;
  steps: string[];
}

export const NOTIFICATION_HELP_SECTIONS: NotificationHelpSection[] = [
  {
    context: "pwa-android",
    title: "App instalado no Android",
    steps: [
      "Atenção: são duas permissões diferentes. Ligar “Notificações” nas Informações do app sozinho NÃO destrava o sino — a permissão que falta é a do site, e ela só muda no Chrome.",
      "Abra o Chrome e toque em ⋮ → Configurações → Configurações do site → Notificações.",
      "Ache o canaldobrito.site na lista de Bloqueados e mude para “Permitir”.",
      "Se preferir, com o site aberto no Chrome, toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir.",
      "Depois de permitir no Chrome, feche o app instalado por completo (tire dos apps recentes ou Forçar parada) e abra de novo antes de tocar no sino.",
    ],
  },
  {
    context: "chrome-android",
    title: "Chrome no celular",
    steps: [
      "Toque em ⋮ → Configurações → Configurações do site → Notificações.",
      "Ache o canaldobrito.site na lista de Bloqueados e mude para “Permitir”.",
      "Ou, com o site aberto, toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir.",
      "Recarregue a página e toque no sino novamente.",
    ],
  },
  {
    context: "ios",
    title: "iPhone",
    steps: [
      "Abra Ajustes → Notificações e veja se o Canal do Brito está permitido.",
      "Se o app não aparecer na lista, remova o atalho da tela inicial e instale de novo pelo Safari (Compartilhar → Adicionar à Tela de Início).",
      "Abra o app instalado e toque no sino novamente.",
    ],
  },
  {
    context: "other",
    title: "Outro navegador ou computador",
    steps: [
      "Toque no cadeado ao lado do endereço do site.",
      "Abra “Permissões” ou “Configurações do site” e mude “Notificações” para “Permitir”.",
      "Recarregue a página e toque no sino novamente.",
    ],
  },
];

/**
 * Detecta o contexto a partir de sinais do ambiente. Os parâmetros
 * são injetáveis para teste; em produção vêm do navegador real.
 */
export function detectNotificationContext(input?: {
  userAgent?: string;
  standalone?: boolean;
  displayModeStandalone?: boolean;
}): NotificationContext {
  const ua =
    input?.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const standalone =
    input?.standalone ??
    (typeof navigator !== "undefined" &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const displayStandalone =
    input?.displayModeStandalone ??
    (typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches);

  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS) return "ios";
  const isAndroid = /Android/.test(ua);
  if (isAndroid && (standalone || displayStandalone)) return "pwa-android";
  if (isAndroid) return "chrome-android";
  return "other";
}

/** Seções ordenadas com o contexto detectado primeiro. */
export function orderedNotificationHelpSections(
  context: NotificationContext
): NotificationHelpSection[] {
  const found =
    NOTIFICATION_HELP_SECTIONS.find((s) => s.context === context) ??
    NOTIFICATION_HELP_SECTIONS[NOTIFICATION_HELP_SECTIONS.length - 1];
  return [found, ...NOTIFICATION_HELP_SECTIONS.filter((s) => s.context !== context)];
}
