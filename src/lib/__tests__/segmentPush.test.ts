import { describe, expect, it, vi } from "vitest";
import {
  SEGMENT_PUSH_STORAGE_KEY,
  loadSegmentEnabled,
  saveSegmentEnabled,
  syncSegmentPreferences,
} from "../segmentPush";
import type { MeuCanalPrefs } from "../meuCanal";

const prefs: MeuCanalPrefs = {
  teams: ["Palmeiras"],
  sports: ["football"],
  competitions: ["Brasileirão"],
};

describe("segmentPush (aviso automático)", () => {
  it("a chave de storage é a documentada", () => {
    expect(SEGMENT_PUSH_STORAGE_KEY).toBe("canalbrito:segment-push:v1");
  });

  it("flag começa desligada e persiste ligada/desligada", () => {
    window.localStorage.removeItem(SEGMENT_PUSH_STORAGE_KEY);
    expect(loadSegmentEnabled()).toBe(false);
    saveSegmentEnabled(true);
    expect(loadSegmentEnabled()).toBe(true);
    saveSegmentEnabled(false);
    expect(loadSegmentEnabled()).toBe(false);
  });

  it("sync chama a RPC com endpoint, listas e enabled", async () => {
    const upsert = vi.fn().mockResolvedValue(true);
    const ok = await syncSegmentPreferences("endpoint-1", prefs, true, {
      upsertPreferences: upsert,
    });
    expect(ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith({
      endpoint: "endpoint-1",
      teams: ["Palmeiras"],
      sports: ["football"],
      competitions: ["Brasileirão"],
      enabled: true,
    });
  });

  it("sync desligando manda enabled false com as listas atuais", async () => {
    const upsert = vi.fn().mockResolvedValue(true);
    await syncSegmentPreferences("endpoint-1", prefs, false, {
      upsertPreferences: upsert,
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("erro da RPC vira false, nunca exceção", async () => {
    const upsert = vi.fn().mockRejectedValue(new Error("rpc falhou"));
    const ok = await syncSegmentPreferences("endpoint-1", prefs, true, {
      upsertPreferences: upsert,
    });
    expect(ok).toBe(false);
  });
});
