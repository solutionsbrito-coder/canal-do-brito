import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// A1+A2+A3 da auditoria de push: o RPC de vínculo/remoção retorna
// boolean, e o sino só acende/apaga com true. Mesma infra de stubs do
// teste de settings atrasadas (vi.hoisted antes das factories).
const settingsState = vi.hoisted(() => ({
  data: { vapid_public_key: "A".repeat(88) } as Record<string, string> | undefined,
  isPending: false,
  refetch: null as unknown as ReturnType<typeof vi.fn>,
}));

const rpcMock = vi.hoisted(() => vi.fn(async () => ({ error: null, data: null })));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => settingsState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// O setup global mocka usePushSubscription para testes de componentes;
// aqui queremos o hook REAL, com as dependências acima mockadas.
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

function rpcImplFor(addResults: boolean[], removeResult: boolean) {
  return async (name: string) => {
    if (name === "upsert_push_subscription") return { error: null, data: null };
    if (name === "add_push_game_id") {
      return { error: null, data: addResults.length > 0 ? addResults.shift() : false };
    }
    if (name === "remove_push_game_id") return { error: null, data: removeResult };
    return { error: null, data: null };
  };
}

describe("usePushSubscription — confirmação real de vínculo (A1+A2+A3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsState.data = { vapid_public_key: "A".repeat(88) };
    settingsState.isPending = false;
    settingsState.refetch = vi.fn(async () => ({ data: settingsState.data }));
    installBrowserStubs();
    // O sino já tem uma inscrição no navegador; o efeito de montagem
    // a sincroniza e a deixa no estado.
    pushGetSubscriptionMock.mockResolvedValue(fakeSub);
    rpcMock.mockImplementation(rpcImplFor([], true));
  });

  afterEach(() => {
    vi.unstubAllGlobals?.();
  });

  async function renderWithSubscription() {
    const hook = renderHook(() => usePushSubscription());
    await act(async () => {});
    expect(hook.result.current.subscription).toEqual(fakeSub);
    return hook;
  }

  it("(a) RPC false → retry após re-sync → true marca o sino (ok)", async () => {
    rpcMock.mockImplementation(rpcImplFor([false, true], true));
    const { result } = await renderWithSubscription();

    let outcome: { ok: boolean; reason?: string } | undefined;
    await act(async () => {
      outcome = await result.current.addGameReminderWithReason("g1");
    });

    expect(outcome).toEqual({ ok: true });
    const addCalls = rpcMock.mock.calls.filter((c) => c[0] === "add_push_game_id");
    expect(addCalls).toHaveLength(2);
    expect(addCalls[0][1]).toEqual({ _endpoint: fakeSub.endpoint, _game_id: "g1" });
  });

  it("(b) RPC false persistente → falha rpc-error, sem acender o sino", async () => {
    rpcMock.mockImplementation(rpcImplFor([false, false], true));
    const { result } = await renderWithSubscription();

    let outcome: { ok: boolean; reason?: string } | undefined;
    await act(async () => {
      outcome = await result.current.addGameReminderWithReason("g1");
    });

    expect(outcome).toEqual({ ok: false, reason: "rpc-error" });
    const addCalls = rpcMock.mock.calls.filter((c) => c[0] === "add_push_game_id");
    expect(addCalls).toHaveLength(2);
  });

  it("(c) mount com sync falho → estado sem inscrição utilizável", async () => {
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "upsert_push_subscription") {
        return { error: { message: "sync boom" }, data: null };
      }
      return { error: null, data: null };
    });
    const { result } = renderHook(() => usePushSubscription());
    await act(async () => {});

    // Nada de endpoint fantasma no estado: o próximo toque no sino
    // passa pelo caminho completo de inscrição, que reporta o erro.
    expect(result.current.subscription).toBeNull();
  });

  it("(d) remover com false → false; com true → true", async () => {
    rpcMock.mockImplementation(rpcImplFor([], false));
    const { result } = await renderWithSubscription();

    let removed: boolean | undefined;
    await act(async () => {
      removed = await result.current.removeGameReminder("g1");
    });
    expect(removed).toBe(false);

    rpcMock.mockImplementation(rpcImplFor([], true));
    await act(async () => {
      removed = await result.current.removeGameReminder("g1");
    });
    expect(removed).toBe(true);
  });
});
