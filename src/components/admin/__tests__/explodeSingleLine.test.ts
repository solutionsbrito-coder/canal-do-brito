import { describe, it, expect } from "vitest";
import { parseScheduleText, explodeSingleLineEvents } from "../ProgramacaoTexto";

const SAMPLE = `TÍTULO: 🗓️ Programação Esportiva — 19/06

📅 Dia 19/06

Moto3 — GP da Chéquia (Treino Livre 1) 🏎️ MotoGP / ⏰ 03h55 📺 ESPN 4
Halle Open (2ª Rodada) 🎾 ATP 500 / ⏰ 06h30 📺 ESPN 2
França (F) x China (F) 🏐 VNL Feminina / ⏰ 10h00 📺 SporTV 2
EUA x Austrália ⚽ Copa do Mundo (Fase de Grupos) / ⏰ 16h00 📺 Cazé TV
Brasil x Haiti ⚽ Copa do Mundo (Fase de Grupos) / ⏰ 21h30 📺 SBT, Globo
Andrew Stewart x Zayne Havener 🥊 Boxe (Card Principal) / ⏰ 22h00 📺 ESPN 3
Sanya E-Prix — Classificação 🏎️ Fórmula E / ⏰ 23h40 📺 BandSports`;

describe("explodeSingleLineEvents", () => {
  it("expands collapsed single-line events into 3 lines", () => {
    const out = explodeSingleLineEvents("Moto3 — GP (TL1) 🏎️ MotoGP / ⏰ 03h55 📺 ESPN 4");
    expect(out.split("\n").filter(Boolean)).toEqual([
      "Moto3 — GP (TL1)",
      "🏎️ MotoGP / ⏰ 03h55",
      "📺 ESPN 4",
    ]);
  });

  it("parses all 7 events from a collapsed AI output", () => {
    const games = parseScheduleText(SAMPLE, "2026-06-19");
    expect(games.length).toBe(7);
    expect(games.map(g => g.game_time).sort()).toEqual(
      ["03:55","06:30","10:00","16:00","21:30","22:00","23:40"]
    );
  });
});
