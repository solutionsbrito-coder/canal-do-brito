import { describe, it, expect } from "vitest";
import { parseScheduleText, parseSportTag, stripSportTags } from "../ProgramacaoTexto";

const TEXT = `📅 Dia 08/08

MotoGP — GP da Grã-Bretanha (Classificação)
🏎️ MotoGP / ⏰ 07h50 / #motogp
📺 ESPN 4

Brasil x ARG ou CHI
🏐 Copa Sul-Americana Masc. (Semifinal) / ⏰ 21h30 / #volei
📺 SporTV 2

Mateusz Gamrot x Quillan Salkilld
🥊 UFC Fight Night (Luta Principal) / ⏰ 21h00 / #mma
📺 UFC Fight Pass

Bubba Wallace x Field
🏎️ Nascar O'Reilly (Corrida) / ⏰ 16h00 / #nascar
📺 Band

Santo André x Jaraguá
🥅 LNF Futsal / ⏰ 19h00 / #futsal
📺 SporTV

Camp. Mundial Sub-20 — Dia 4
🏃 Atletismo / ⏰ 13h00 / #atletismo
📺 SporTV 3
`;

describe("tags #esporte", () => {
  const games = parseScheduleText(TEXT, "2026-08-08");
  const bySport = (home: string) => games.find((g) => g.home_team.startsWith(home));

  it("parseSportTag reconhece slugs canônicos e acentuados", () => {
    expect(parseSportTag("🏐 Copa / ⏰ 21h30 / #volei")).toBe("volleyball");
    expect(parseSportTag("x / #Ginástica")).toBe("gymnastics");
    expect(parseSportTag("sem tag aqui")).toBeNull();
  });

  it("stripSportTags remove a tag e o separador", () => {
    expect(stripSportTags("🏐 Copa Sul-Americana Masc. / ⏰ 21h30 / #volei"))
      .toBe("🏐 Copa Sul-Americana Masc. / ⏰ 21h30");
  });

  it("classifica todos os eventos pela tag", () => {
    expect(bySport("Brasil")?.sport_type).toBe("volleyball");
    expect(bySport("Mateusz")?.sport_type).toBe("mma");
    expect(bySport("Bubba")?.sport_type).toBe("f1");
    expect(bySport("Santo André")?.sport_type).toBe("futsal");
    expect(bySport("Camp. Mundial")?.sport_type).toBe("athletics");
    expect(bySport("MotoGP")?.sport_type).toBe("f1");
  });

  it("marca a origem como tag", () => {
    expect(games.every((g) => g.sportSource === "tag")).toBe(true);
  });

  it("não deixa a tag vazar para competição, times ou horário", () => {
    for (const g of games) {
      expect(`${g.home_team} ${g.away_team} ${g.competition} ${g.competition_detail}`).not.toContain("#");
      expect(g.game_time).not.toBe("00:00");
      expect(g.competition.trim().length).toBeGreaterThan(0);
    }
    expect(bySport("Brasil")?.competition).toBe("Copa Sul-Americana Masc.");
    expect(bySport("Brasil")?.competition_detail).toBe("Semifinal");
  });
});
