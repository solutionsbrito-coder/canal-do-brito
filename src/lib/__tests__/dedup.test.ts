import { describe, it, expect } from "vitest";
import { gameKey } from "@/lib/dedup";

describe("gameKey normalization", () => {
  const base = { home_team: "Botafogo", away_team: "Flamengo", game_time: "19:00", sport_type: "football" };

  it("ignora espaços ao redor", () => {
    expect(gameKey(base)).toBe(gameKey({ ...base, home_team: "  Botafogo  " }));
  });

  it("ignora maiúsculas/minúsculas", () => {
    expect(gameKey(base)).toBe(gameKey({ ...base, home_team: "BOTAFOGO" }));
  });

  it("trata NBSP como espaço normal", () => {
    expect(gameKey({ ...base, home_team: "Sao Paulo" })).toBe(
      gameKey({ ...base, home_team: "Sao\u00A0Paulo" })
    );
  });

  it("colapsa múltiplos espaços", () => {
    expect(gameKey({ ...base, home_team: "Sao  Paulo" })).toBe(
      gameKey({ ...base, home_team: "Sao Paulo" })
    );
  });

  it("normaliza NFKC (unicode equivalente)", () => {
    // "São" composto vs decomposto
    const composed = "S\u00E3o Paulo";
    const decomposed = "Sa\u0303o Paulo".normalize("NFC");
    expect(gameKey({ ...base, home_team: composed })).toBe(
      gameKey({ ...base, home_team: decomposed })
    );
  });

  it("inclui sport_type na chave", () => {
    expect(gameKey({ ...base, sport_type: "football" })).not.toBe(
      gameKey({ ...base, sport_type: "basketball" })
    );
  });

  it("trata segundos no horário (slice 0,5)", () => {
    expect(gameKey({ ...base, game_time: "19:00:00" })).toBe(gameKey(base));
  });

  it("away_team vazio é normalizado", () => {
    expect(gameKey({ ...base, away_team: "" })).toBe(
      gameKey({ ...base, away_team: "  " })
    );
  });
});
