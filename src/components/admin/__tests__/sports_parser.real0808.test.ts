import { describe, it, expect } from "vitest";
import { parseScheduleText } from "../ProgramacaoTexto";

/** Texto real gerado pela IA (08/08) — regressão dos cards com 00:00 / "Sem competição" */
const REAL_TEXT = `📅 Dia 08/08

MotoGP — GP da Grã-Bretanha (Classificação)

🏎️ MotoGP / ⏰ 07h50

📺 ESPN 4

Heidenheim x Osnabrück

⚽ Bundesliga 2ª Divisão / ⏰ 08h00

📺 YouTube Canal GOAT

Tour de France Fem. — Etapa 8

🚴 Ciclismo / ⏰ 10h45

📺 ESPN 3

Camp. Mundial Sub-20 — Dia 4

🏃 Atletismo / ⏰ 13h00

📺 SporTV 3

World Surf League — Etapa de Teahupo'o

🏄 World Surf League / ⏰ 14h00

📺 SporTV, GETV

Camp. Brasileiro — Finais

🤸 Ginástica Artística / ⏰ 14h30

📺 SporTV 2, GETV

Corinthians x Pato

⚽ LNF Futsal / ⏰ 19h00

📺 XSports, LNF TV

Mateusz Gamrot x Quillan Salkilld

🥊 UFC Fight Night (Luta Principal) / ⏰ 21h00

📺 Paramount+`;

describe("parseScheduleText — texto real 08/08", () => {
  const games = parseScheduleText(REAL_TEXT, "2026-08-08");

  it("não gera nenhum evento com horário 00:00", () => {
    expect(games.length).toBeGreaterThanOrEqual(8);
    expect(games.filter((g) => g.game_time === "00:00")).toHaveLength(0);
  });

  it("não gera nenhum evento sem competição", () => {
    expect(games.filter((g) => !g.competition)).toHaveLength(0);
  });

  it("atletismo: mantém o título, horário 13:00 e competição Atletismo", () => {
    const g = games.find((x) => x.sport_type === "athletics");
    expect(g).toBeDefined();
    expect(g!.home_team).toContain("Sub-20");
    expect(g!.game_time).toBe("13:00");
    expect(g!.competition).toBe("Atletismo");
    expect(g!.channels).toContain("SporTV 3");
  });

  it("ginástica: classifica como gymnastics às 14:30", () => {
    const g = games.find((x) => x.sport_type === "gymnastics");
    expect(g).toBeDefined();
    expect(g!.game_time).toBe("14:30");
    expect(g!.home_team).toContain("Camp. Brasileiro");
  });

  it("MotoGP: preserva título e horário 07:50", () => {
    const g = games.find((x) => x.home_team.startsWith("MotoGP"));
    expect(g).toBeDefined();
    expect(g!.game_time).toBe("07:50");
    expect(g!.sport_type).toBe("f1");
  });

  it("horário compacto no título é recuperado", () => {
    const compact = parseScheduleText(`Atletismo / 13h00\n📺 SporTV 3`, "2026-08-08");
    expect(compact).toHaveLength(1);
    expect(compact[0].game_time).toBe("13:00");
    expect(compact[0].home_team).toBe("Atletismo");
  });
});
