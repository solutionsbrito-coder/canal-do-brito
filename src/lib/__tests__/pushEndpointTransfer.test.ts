import { describe, expect, it, vi } from "vitest";
import {
  PUSH_ENDPOINT_STORAGE_KEY,
  transferPushEndpointIfRotated,
  type PushEndpointTransferDeps,
} from "../pushEndpointTransfer";

function makeDeps(overrides: Partial<PushEndpointTransferDeps> = {}) {
  let stored: string | null = null;
  const deps: PushEndpointTransferDeps = {
    getStoredEndpoint: () => stored,
    setStoredEndpoint: (endpoint: string) => {
      stored = endpoint;
    },
    transferGameIds: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return {
    deps,
    getStored: () => stored,
    setStored: (value: string | null) => {
      stored = value;
    },
  };
}

describe("transferPushEndpointIfRotated (B1)", () => {
  it("sem endpoint guardado: só guarda o atual, sem chamar a RPC", async () => {
    const { deps, getStored } = makeDeps();
    await transferPushEndpointIfRotated("novo-endpoint", deps);
    expect(deps.transferGameIds).not.toHaveBeenCalled();
    expect(getStored()).toBe("novo-endpoint");
  });

  it("endpoint igual ao guardado: não chama a RPC", async () => {
    const { deps } = makeDeps();
    deps.getStoredEndpoint = () => "mesmo-endpoint";
    await transferPushEndpointIfRotated("mesmo-endpoint", deps);
    expect(deps.transferGameIds).not.toHaveBeenCalled();
  });

  it("endpoint diferente: transfere do antigo para o novo e atualiza o guardado", async () => {
    const { deps, getStored } = makeDeps();
    deps.getStoredEndpoint = () => "antigo-endpoint";
    await transferPushEndpointIfRotated("novo-endpoint", deps);
    expect(deps.transferGameIds).toHaveBeenCalledWith("antigo-endpoint", "novo-endpoint");
    expect(getStored()).toBe("novo-endpoint");
  });

  it("RPC falhou: não quebra e ainda atualiza o guardado", async () => {
    const { deps, getStored } = makeDeps({
      transferGameIds: vi.fn().mockRejectedValue(new Error("rpc falhou")),
    });
    deps.getStoredEndpoint = () => "antigo-endpoint";
    await expect(
      transferPushEndpointIfRotated("novo-endpoint", deps)
    ).resolves.toBeUndefined();
    expect(getStored()).toBe("novo-endpoint");
  });

  it("storage indisponível: não quebra", async () => {
    const { deps } = makeDeps({
      getStoredEndpoint: () => {
        throw new Error("sem storage");
      },
      setStoredEndpoint: () => {
        throw new Error("sem storage");
      },
    });
    await expect(
      transferPushEndpointIfRotated("novo-endpoint", deps)
    ).resolves.toBeUndefined();
    expect(deps.transferGameIds).not.toHaveBeenCalled();
  });

  it("a chave de storage é a documentada", () => {
    expect(PUSH_ENDPOINT_STORAGE_KEY).toBe("canalbrito:push-endpoint:v1");
  });
});
