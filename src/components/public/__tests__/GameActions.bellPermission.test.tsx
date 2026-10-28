import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { DailyGame } from "@/hooks/useDailyGames";

// Estado controlável do sino mockado. vi.hoisted roda antes das
// factories do vi.mock (que são içadas), sem ele as factories
// bateriam na zona morta (TDZ) dessas variáveis.
const { mockPush, mockReminded, mockToast, mockDownloadIcs, mockMinutes, mockShowNotification } = vi.hoisted(() => {
  const mockPush: {
    permission: NotificationPermission;
    refreshPermission: ReturnType<typeof vi.fn>;
    addGameReminderWithReason: ReturnType<typeof vi.fn>;
    removeGameReminder: ReturnType<typeof vi.fn>;
    settingsLoading: boolean;
    isSupported: boolean;
  } = {
    permission: "default",
    refreshPermission: null as unknown as ReturnType<typeof vi.fn>,
    addGameReminderWithReason: null as unknown as ReturnType<typeof vi.fn>,
    removeGameReminder: null as unknown as ReturnType<typeof vi.fn>,
    settingsLoading: false,
    isSupported: true,
  };
  mockPush.refreshPermission = vi.fn(() => mockPush.permission);
  mockPush.addGameReminderWithReason = vi.fn(async () => ({ ok: true as const }));
  mockPush.removeGameReminder = vi.fn(async () => true);
  // Minutos até o jogo, controláveis por teste (padrão: fluxo normal).
  const mockMinutes = { value: 60 };
  const mockShowNotification = vi.fn(async () => undefined);
  return {
    mockPush,
    mockMinutes,
    mockShowNotification,
    mockReminded: {
      reminded: new Set<string>(),
      markReminded: vi.fn(),
      unmarkReminded: vi.fn(),
    },
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
    mockDownloadIcs: vi.fn(),
  };
});

vi.mock("@/hooks/usePushSubscription", () => ({
  usePushSubscription: () => mockPush,
}));

vi.mock("@/hooks/useRemindedGames", () => ({
  useRemindedGames: () => mockReminded,
}));

vi.mock("@/hooks/useMeuCanal", () => ({
  useMeuCanal: () => ({
    prefs: {},
    toggleTeam: vi.fn(),
    toggleSport: vi.fn(),
    toggleCompetition: vi.fn(),
  }),
}));

vi.mock("@/lib/meuCanal", () => ({
  isTeamFollowed: () => false,
  isSportFollowed: () => false,
  isCompetitionFollowed: () => false,
}));

vi.mock("@/lib/gameUtils", () => ({
  getMinutesUntilStart: () => mockMinutes.value,
  isGameCurrentlyLive: () => false,
  SPORT_LABEL: { futebol: "Futebol" },
}));

vi.mock("@/components/agenda/public/highlightsCuration", () => ({
  detectedSport: () => "futebol",
}));

vi.mock("@/lib/ics", () => ({
  downloadGameIcs: (...args: unknown[]) => mockDownloadIcs(...args),
}));

vi.mock("@/components/public/ShareCardButton", () => ({
  ShareCardButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import { GameActions } from "../GameActions";

const game: DailyGame = {
  id: "g1",
  date: "2026-10-28",
  home_team: "Teste A",
  away_team: "Teste B",
  competition: "Teste",
  competition_detail: null,
  game_time: "12:40",
  channels: [],
  is_live: false,
  is_womens: false,
  active: true,
  archived: false,
  status_short: "",
  elapsed_minutes: null,
  publish_at: null,
  sport_type: "football",
  created_at: "",
};

function renderActions() {
  render(<GameActions game={game} />);
  return screen.getByRole("button", { name: /Me avise 15 min antes de Teste A/ });
}

function setMatchMediaStandalone(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("GameActions — ajuda de permissão do sino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.permission = "default";
    mockPush.refreshPermission = vi.fn(() => mockPush.permission);
    mockPush.addGameReminderWithReason = vi.fn(async () => ({ ok: true as const }));
    mockPush.settingsLoading = false;
    mockReminded.reminded = new Set<string>();
    mockMinutes.value = 60;
    setMatchMediaStandalone(false);
  });

  it("permissão default: mostra o aviso antes do pedido e não chama o lembrete ainda", async () => {
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(
      await screen.findByRole("dialog", { name: "Ativar lembrete" })
    ).toBeInTheDocument();
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
  });

  it("permissão default: botão Permitir do aviso segue o fluxo normal", async () => {
    const bell = renderActions();
    await fireEvent.click(bell);
    await fireEvent.click(
      await screen.findByRole("button", { name: "Permitir e ativar o lembrete" })
    );
    expect(mockPush.addGameReminderWithReason).toHaveBeenCalledWith("g1");
    expect(mockReminded.markReminded).toHaveBeenCalledWith("g1");
  });

  it("permissão denied: abre o diálogo de ajuda SEM chamar o lembrete (sem novo requestPermission)", async () => {
    mockPush.permission = "denied";
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(
      await screen.findByRole("dialog", { name: /Notificações bloqueadas/ })
    ).toBeInTheDocument();
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
  });

  it("C3 — ajuda: mostra som do canal e 'não force a parada do Chrome'", async () => {
    mockPush.permission = "denied";
    const bell = renderActions();
    await fireEvent.click(bell);
    await screen.findByRole("dialog", { name: /Notificações bloqueadas/ });
    expect(screen.getByText(/Depois de liberar, atenção a mais duas coisas/)).toBeInTheDocument();
    expect(screen.getByText(/Sem som\?/)).toBeInTheDocument();
    expect(screen.getByText(/não consegue escolher um som próprio/)).toBeInTheDocument();
    expect(screen.getByText(/Não force a parada do Chrome/)).toBeInTheDocument();
    expect(screen.getByText(/pode ficar retido/)).toBeInTheDocument();
  });

  it("C5 — sino mostra 'Verificando...' enquanto o RPC não retorna", async () => {
    mockPush.permission = "granted";
    let resolveReminder!: (v: { ok: true }) => void;
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolveReminder = resolve;
    });
    mockPush.addGameReminderWithReason = vi.fn(() => pending);
    const bell = renderActions();
    fireEvent.click(bell);
    expect(await screen.findByText("Verificando...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verificando lembrete" })).toBeDisabled();
    expect(mockReminded.markReminded).not.toHaveBeenCalled();
    resolveReminder({ ok: true });
    await waitFor(() => {
      expect(mockReminded.markReminded).toHaveBeenCalledWith("g1");
    });
  });

  it("permissão denied no PWA Android: caminho principal é o Chrome, não só o app", async () => {
    mockPush.permission = "denied";
    Object.defineProperty(window, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile" },
      configurable: true,
    });
    setMatchMediaStandalone(true);
    const bell = renderActions();
    await fireEvent.click(bell);
    await screen.findByRole("dialog", { name: /Notificações bloqueadas/ });
    expect(screen.getByText("App instalado no Android")).toBeInTheDocument();
    // Avisa que o interruptor do app sozinho não basta…
    expect(screen.getByText(/sozinho NÃO destrava o sino/)).toBeInTheDocument();
    // …e dá como caminho principal as configurações do site no Chrome
    // (o texto aparece também nas seções recolhidas, por isso getAll).
    expect(screen.getAllByText(/Configurações do site/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/lista de Bloqueados/).length).toBeGreaterThanOrEqual(1);
  });

  it("permissão granted: vai direto ao fluxo normal, sem diálogo", async () => {
    mockPush.permission = "granted";
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(mockPush.addGameReminderWithReason).toHaveBeenCalledWith("g1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ajuda: Tentar de novo com permissão ainda negada não chama o lembrete e mantém o diálogo", async () => {
    mockPush.permission = "denied";
    const bell = renderActions();
    await fireEvent.click(bell);
    await fireEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /Notificações bloqueadas/ })).toBeInTheDocument();
  });

  it("ajuda: Tentar de novo após liberar a permissão ativa o lembrete", async () => {
    mockPush.permission = "denied";
    const bell = renderActions();
    await fireEvent.click(bell);
    mockPush.permission = "granted";
    await fireEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(mockPush.addGameReminderWithReason).toHaveBeenCalledWith("g1");
    expect(mockReminded.markReminded).toHaveBeenCalledWith("g1");
  });

  it("ajuda: botão .ics baixa a agenda sem precisar de permissão", async () => {
    mockPush.permission = "denied";
    const bell = renderActions();
    await fireEvent.click(bell);
    await fireEvent.click(await screen.findByRole("button", { name: /Adicionar à agenda/ }));
    expect(mockDownloadIcs).toHaveBeenCalledWith(game);
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
  });

  it("falha por permissão durante o pedido abre a ajuda, não o erro genérico", async () => {
    mockPush.addGameReminderWithReason = vi.fn(async () => ({
      ok: false as const,
      reason: "permission-denied" as const,
    }));
    const bell = renderActions();
    await fireEvent.click(bell);
    await fireEvent.click(
      await screen.findByRole("button", { name: "Permitir e ativar o lembrete" })
    );
    expect(
      await screen.findByRole("dialog", { name: /Notificações bloqueadas/ })
    ).toBeInTheDocument();
  });

  it("settings carregando: sino desabilitado com 'Carregando...' e não chama o lembrete", async () => {
    mockPush.settingsLoading = true;
    const bell = renderActions();
    expect(bell).toBeDisabled();
    expect(bell).toHaveTextContent("Carregando...");
    await fireEvent.click(bell);
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("falha de banco tem mensagem própria e não abre a ajuda nem marca o lembrete", async () => {
    mockPush.permission = "granted";
    mockPush.addGameReminderWithReason = vi.fn(async () => ({
      ok: false as const,
      reason: "rpc-error" as const,
    }));
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(mockReminded.markReminded).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining("Não foi possível salvar o lembrete")
    );
  });

  it("A3: remover sem confirmação do banco mantém o sino marcado e mostra erro", async () => {
    mockPush.permission = "granted";
    mockPush.removeGameReminder = vi.fn(async () => false);
    mockReminded.reminded = new Set<string>(["g1"]);
    render(<GameActions game={game} />);
    const bell = screen.getByRole("button", { name: /Remover lembrete de Teste A/ });
    await fireEvent.click(bell);
    expect(mockPush.removeGameReminder).toHaveBeenCalledWith("g1");
    expect(mockReminded.unmarkReminded).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining("Não foi possível remover o lembrete")
    );
    expect(mockToast.info).not.toHaveBeenCalled();
  });

  it("A3: remover com confirmação do banco desmarca e avisa", async () => {
    mockPush.permission = "granted";
    mockPush.removeGameReminder = vi.fn(async () => true);
    mockReminded.reminded = new Set<string>(["g1"]);
    render(<GameActions game={game} />);
    const bell = screen.getByRole("button", { name: /Remover lembrete de Teste A/ });
    await fireEvent.click(bell);
    expect(mockReminded.unmarkReminded).toHaveBeenCalledWith("g1");
    expect(mockToast.info).toHaveBeenCalledWith("Lembrete removido.");
  });
});

describe("GameActions — A4 sino tardio (aviso local, sem lembrete morto)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.permission = "granted";
    mockPush.refreshPermission = vi.fn(() => mockPush.permission);
    mockPush.addGameReminderWithReason = vi.fn(async () => ({ ok: true as const }));
    mockPush.settingsLoading = false;
    mockReminded.reminded = new Set<string>();
    mockMinutes.value = 60;
    mockShowNotification.mockImplementation(async () => undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ showNotification: mockShowNotification }) },
      configurable: true,
    });
    setMatchMediaStandalone(false);
  });

  it("sino tardio (10 min): dispara notificação local e NÃO chama o vínculo no servidor", async () => {
    mockMinutes.value = 10;
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(mockShowNotification).toHaveBeenCalledWith(
      "Começa em 10 min!",
      expect.objectContaining({
        body: "Teste A x Teste B — Teste",
        tag: "game-g1-now",
      })
    );
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
    expect(mockReminded.markReminded).not.toHaveBeenCalled();
    // O aviso local passa por awaits (serviceWorker.ready) — espera
    // as microtarefas antes de afirmar o toast.
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining("Aviso na hora")
      )
    );
  });

  it("fronteira: 13 min usa o fluxo normal do servidor (12 min ou menos é aviso local)", async () => {
    mockMinutes.value = 13;
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(mockPush.addGameReminderWithReason).toHaveBeenCalledWith("g1");
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it("sino tardio com falha na notificação local: erro honesto e sino não marcado", async () => {
    mockMinutes.value = 5;
    mockShowNotification.mockRejectedValueOnce(new Error("sw gone"));
    const bell = renderActions();
    await fireEvent.click(bell);
    expect(mockPush.addGameReminderWithReason).not.toHaveBeenCalled();
    expect(mockReminded.markReminded).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Não foi possível mostrar o aviso na hora")
      )
    );
  });
});
