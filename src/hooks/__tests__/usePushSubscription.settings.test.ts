import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Estado controlável da consulta de settings (mesmo padrão dos
// outros testes do repo: vi.hoisted antes das factories do vi.mock).
const settingsState = vi.hoisted(() => ({
  data: undefined as Record<string, string> | undefined,
  isPending: false,
  refetch: null as unknown as ReturnType<typeof vi.fn>,
}));

const rpcMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => settingsState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// O setup global mocka usePushSubscription para os testes de
// componentes; aqui queremos o hook REAL, com as dependências
// acima mockadas — importActual desfaz só o mock do setup.
vi.mock("../usePushSubscription", async () => {
  const actual = await vi.importActual<typeof import("../usePushSubscription")>(
    "../usePushSubscription"
  );
  return actual;
});

import { usePushSubscription } from "../usePushSubscription";

const fakeSub = {
  endpoint: "https://example.test/push",
  toJSON: () => ({ keys: { p256dh: "p256dh-test", auth: "auth-test" } }),
};

const requestPermissionMock = vi.fn(async () => "granted" as NotificationPermission);
const pushSubscribeMock = vi.fn(async () => fakeSub);
const pushGetSubscriptionMock = vi.fn(async () => null);

function installBrowserStubs() {
  (globalThis as unknown as { Notification: unknown }).Notification = {
    permission: "granted",
    requestPermission: requestPermissionMock,
  };
  (window as unknown as { PushManager: unknown }).PushManager = class {};
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: pushGetSubscriptionMock,
          subscribe: pushSubscribeMock,
        },
      }),
    },
    configurable: true,
  });
}

describe("usePushSubscription — leitura atrasada de settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsState.data = undefined;
    settingsState.isPending = false;
    settingsState.refetch = vi.fn(async () => ({ data: {} }));
    installBrowserStubs();
  });

  afterEach(() => {
    vi.unstubAllGlobals?.();
  });

  it("chave chegando atrasada: refaz a leitura e a inscrição prossegue", async () => {
    settingsState.isPending = true;
    settingsState.refetch = vi.fn(async () => ({
      data: { vapid_public_key: "A".repeat(88) },
    }));
    const { result } = renderHook(() => usePushSubscription());
    expect(result.current.settingsLoading).toBe(true);

    let outcome: { ok: boolean; reason?: string } | undefined;
    await act(async () => {
      outcome = await result.current.subscribeDevice();
    });

    expect(settingsState.refetch).toHaveBeenCalledTimes(1);
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    expect(pushSubscribeMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("upsert_push_subscription", expect.anything());
    expect(outcome).toEqual({ ok: true });
  });

  it("chave realmente ausente após o refetch: mantém no-vapid sem pedir permissão", async () => {
    settingsState.refetch = vi.fn(async () => ({ data: {} }));
    const { result } = renderHook(() => usePushSubscription());

    let outcome: { ok: boolean; reason?: string } | undefined;
    await act(async () => {
      outcome = await result.current.subscribeDevice();
    });

    expect(settingsState.refetch).toHaveBeenCalledTimes(1);
    expect(requestPermissionMock).not.toHaveBeenCalled();
    expect(pushSubscribeMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ ok: false, reason: "no-vapid" });
  });

  it("chave já presente: não refaz a leitura e inscreve direto", async () => {
    settingsState.data = { vapid_public_key: "A".repeat(88) };
    const { result } = renderHook(() => usePushSubscription());

    let outcome: { ok: boolean; reason?: string } | undefined;
    await act(async () => {
      outcome = await result.current.subscribeDevice();
    });

    expect(settingsState.refetch).not.toHaveBeenCalled();
    expect(outcome).toEqual({ ok: true });
  });
});
