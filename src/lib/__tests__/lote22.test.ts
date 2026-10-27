import { describe, it, expect } from "vitest";
import { isSecretSettingKey } from "@/lib/settingsSecret";

describe("Lote 2.2 — flag is_secret espelha o trigger do banco", () => {
  it("marca tmdb_api_key como secreta", () => {
    expect(isSecretSettingKey("tmdb_api_key")).toBe(true);
  });
  it("marca outros nomes de segredo (token, password, vapid_private)", () => {
    expect(isSecretSettingKey("vapid_private_key")).toBe(true);
    expect(isSecretSettingKey("access_token")).toBe(true);
    expect(isSecretSettingKey("db_password")).toBe(true);
  });
  it("não marca chaves comuns (whatsapp, site_url, vapid_public_key)", () => {
    expect(isSecretSettingKey("whatsapp")).toBe(false);
    expect(isSecretSettingKey("site_url")).toBe(false);
    expect(isSecretSettingKey("vapid_public_key")).toBe(false);
  });
});
