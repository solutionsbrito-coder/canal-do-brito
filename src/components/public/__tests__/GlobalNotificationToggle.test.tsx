import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Estado controlável do push mockado (mesmo padrão do teste do sino:
// vi.hoisted antes das factories do vi.mock, que são içadas).
const { mockPush, mockToast } = vi.hoisted(() => {
  const mockPush: {
    permission: NotificationPermission;
    subscription: unknown | null;
    refreshPermission: ReturnType<typeof vi.fn>;
    subscribeDevice: ReturnType<typeof vi.fn>;
    settingsLoading: boolean;
    isSupported: boolean;
  } = {
    permission: "default",
    subscription: null,
    refreshPermission: null as unknown as ReturnType<typeof vi.fn>,
    subscribeDevice: null as unknown as ReturnType<typeof vi.fn>,
    settingsLoading: false,
    isSupported: true,
  };
  mockPush.refreshPermission = vi.fn(() => mockPush.permission);
  mockPush.subscribeDevice = vi.fn(async () => ({ ok: true as const }));
  return {
    mockPush,
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  };
});

vi.mock("@/hooks/usePushSubscription", () => ({
  usePushSubscription: () => mockPush,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import { GlobalNotificationToggle } from "../GlobalNotificationToggle";

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

describe("GlobalNotificationToggle — botão global de notificações", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.permission = "default";
    mockPush.subscription = null;
    mockPush.settingsLoading = false;
    mockPush.isSupported = true;
    mockPush.refreshPermission = vi.fn(() => mockPush.permission);
    mockPush.subscribeDevice = vi.fn(async () => ({ ok: true as const }));
    setMatchMediaStandalone(false);
  });

  it("explica que só libera o aparelho e não promete lembrete de jogo específico", () => {
    render(<GlobalNotificationToggle />);
    expect(
      screen.getByText(/só libera o aparelho/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/continuam sendo marcados jogo por jogo/i)
    ).toBeInTheDocument();
  });

  it("permissão default: mostra o aviso antes do pedido e não inscreve ainda", async () => {
    render(<GlobalNotificationToggle />);
    await fireEvent.click(
      screen.getByRole("button", { name: "Ativar notificações neste aparelho" })
    );
    expect(
      await screen.findByRole("dialog", { name: "Ativar lembrete" })
    ).toBeInTheDocument();
    expect(mockPush.subscribeDevice).not.toHaveBeenCalled();
  });

  it("permissão default: botão Permitir do aviso inscreve o aparelho (sem jogo)", async () => {
    render(<GlobalNotificationToggle />);
    await fireEvent.click(
      screen.getByRole("button", { name: "Ativar notificações neste aparelho" })
    );
    await fireEvent.click(
      await screen.findByRole("button", { name: "Permitir notificações" })
    );
    expect(mockPush.subscribeDevice).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("Notificações ativas neste aparelho")
    );
  });

  it("permissão denied: abre a ajuda SEM inscrever (sem novo requestPermission)", async () => {
    mockPush.permission = "denied";
    render(<GlobalNotificationToggle />);
    await fireEvent.click(
      screen.getByRole("button", { name: "Ativar notificações neste aparelho" })
    );
    expect(
      await screen.findByRole("dialog", { name: /Notificações bloqueadas/ })
    ).toBeInTheDocument();
    expect(mockPush.subscribeDevice).not.toHaveBeenCalled();
  });

  it("ajuda: Tentar de novo após liberar a permissão inscreve o aparelho", async () => {
    mockPush.permission = "denied";
    render(<GlobalNotificationToggle />);
    await fireEvent.click(
      screen.getByRole("button", { name: "Ativar notificações neste aparelho" })
    );
    mockPush.permission = "granted";
    await fireEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(mockPush.subscribeDevice).toHaveBeenCalledTimes(1);
  });

  it("permissão granted + inscrição ativa: mostra estado ativo e não pede de novo", async () => {
    mockPush.permission = "granted";
    mockPush.subscription = { endpoint: "https://example.test/push" };
    render(<GlobalNotificationToggle />);
    const active = screen.getByRole("button", {
      name: "Notificações ativas neste aparelho",
    });
    expect(active).toBeInTheDocument();
    expect(active).toBeDisabled();
    await fireEvent.click(active);
    expect(mockPush.subscribeDevice).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("settings carregando: botão desabilitado com 'Carregando...' e não inscreve", async () => {
    mockPush.settingsLoading = true;
    render(<GlobalNotificationToggle />);
    const button = screen.getByRole("button", { name: "Carregando notificações" });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Carregando...");
    await fireEvent.click(button);
    expect(mockPush.subscribeDevice).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("permissão granted sem inscrição: inscreve direto, sem diálogo", async () => {
    mockPush.permission = "granted";
    mockPush.subscription = null;
    render(<GlobalNotificationToggle />);
    await fireEvent.click(
      screen.getByRole("button", { name: "Ativar notificações neste aparelho" })
    );
    expect(mockPush.subscribeDevice).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
