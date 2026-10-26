import { describe, it, expect } from "vitest";
import { parseScheduleText } from "../ProgramacaoTexto";

describe("parseScheduleText - novos esportes", () => {
  it("detecta rugby via emoji 🏉", () => {
    const text = `Crusaders x Blues
🏉 Super Rugby / ⏰ 06h05
📺 ESPN 4`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("rugby");
    expect(games[0].competition).toBe("Super Rugby");
  });

  it("detecta surf via emoji 🏄", () => {
    const text = `World Surf League — Etapa Pipeline
🏄 WSL / ⏰ 18h00
📺 SporTV 2`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("surf");
  });

  it("detecta natação via emoji 🏊", () => {
    const text = `Brasil x Austrália
🏊 World Aquatics / ⏰ 14h30
📺 SporTV`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("swimming");
  });

  it("detecta ciclismo via emoji 🚴", () => {
    const text = `Tour de France — Etapa 12
🚴 Ciclismo / ⏰ 10h00
📺 ESPN`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("cycling");
  });

  it("detecta golf via emoji ⛳", () => {
    const text = `Masters — Primeira Rodada
⛳ PGA Tour / ⏰ 10h00
📺 ESPN`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("golf");
  });

  it("detecta rugby via regex sem emoji", () => {
    const text = `All Blacks x Springboks
🏆 World Rugby / ⏰ 09h00
📺 ESPN 2`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("rugby");
  });

  it("detecta surf via regex sem emoji", () => {
    const text = `Gabriel Medina
🏆 WSL Pipeline / ⏰ 20h00
📺 SporTV`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("surf");
  });

  it("programação mista com múltiplos esportes", () => {
    const text = `📅 Dia 01/04

Crusaders x Blues
🏉 Super Rugby / ⏰ 06h05
📺 ESPN 4

Brasil x Austrália
🏊 World Aquatics / ⏰ 14h30
📺 SporTV

Flamengo x Palmeiras
🏆 Brasileirão / ⏰ 19h00
📺 Premiere`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(3);
    expect(games[0].sport_type).toBe("rugby");
    expect(games[1].sport_type).toBe("swimming");
    expect(games[2].sport_type).toBe("football");
  });

  it("detecta MMA via regex UFC", () => {
    const text = `Islam Makhachev x Arman Tsarukyan
🥊 UFC 312 / ⏰ 23h00
📺 Canal Combate`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("mma");
  });

  it("detecta MMA via regex Bellator", () => {
    const text = `Patricio Pitbull x AJ McKee
🥊 Bellator 300 / ⏰ 22h00
📺 ESPN 2`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("mma");
  });

  it("detecta Boxe via regex WBC", () => {
    const text = `Canelo Alvarez x Jermell Charlo
🥊 WBC Championship / ⏰ 23h00
📺 ESPN`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("boxing");
  });

  it("detecta Boxe via regex WBA", () => {
    const text = `Tyson Fury x Oleksandr Usyk
🥊 WBA Heavyweight / ⏰ 18h00
📺 Canal Combate`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("boxing");
  });

  it("detecta Boxe via palavra 'Boxe'", () => {
    const text = `Amanda Serrano x Katie Taylor
🏆 Boxe Internacional / ⏰ 22h00
📺 ESPN`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].sport_type).toBe("boxing");
  });

  it("emoji 🥊 com competição genérica cai em football (fallback)", () => {
    const text = `Lutador A x Lutador B
🥊 Campeonato Nacional / ⏰ 21h00
📺 SporTV`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    // 🥊 is ambiguous, detectSportType decides — no UFC/boxing keyword → football fallback
    expect(games[0].sport_type).toBe("football");
  });
});

describe("splitChannels — separadores múltiplos", () => {
  it("separa canais por '/' (Globo / Paramount+)", () => {
    const text = `Time A x Time B
🏆 Liga / ⏰ 21h00
📺 Globo / Paramount+`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].channels).toEqual(["Globo", "Paramount+"]);
  });

  it("separa canais por '|' (ESPN | SporTV)", () => {
    const text = `Time A x Time B
🏆 Liga / ⏰ 21h00
📺 ESPN | SporTV`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games[0].channels).toEqual(["ESPN", "SporTV"]);
  });

  it("separa canais por ',' e ' e ' juntos", () => {
    const text = `Time A x Time B
🏆 Liga / ⏰ 21h00
📺 Globo, Premiere e SporTV`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games[0].channels).toEqual(["Globo", "Premiere", "SporTV"]);
  });

  it("mistura todos os separadores: '/', '|', ',' e ' e '", () => {
    const text = `Time A x Time B
🏆 Liga / ⏰ 21h00
📺 Globo / Paramount+, ESPN | SporTV e Premiere`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games[0].channels).toEqual(["Globo", "Paramount+", "ESPN", "SporTV", "Premiere"]);
  });

  it("preserva canais únicos sem separadores", () => {
    const text = `Time A x Time B
🏆 Liga / ⏰ 21h00
📺 Premiere`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games[0].channels).toEqual(["Premiere"]);
  });

  it("ignora espaços extras e itens vazios", () => {
    const text = `Time A x Time B
🏆 Liga / ⏰ 21h00
📺 Globo /  / Paramount+ ,  ESPN`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games[0].channels).toEqual(["Globo", "Paramount+", "ESPN"]);
  });
});

describe("Auto-bump date for dawn games (00:00–04:59) — opt-in via flag", () => {
  const BUMP = { autoBumpMidnight: true };

  it("bumps date +1 for 00:00 game when flag is ON and date comes from header", () => {
    const text = `📅 Dia 04/04

Santos Laguna x América-MEX
🏆 Liga MX
⏰ 00h00
📺 ESPN`;
    const result = parseScheduleText(text, "2026-04-04", BUMP);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-05");
    expect(result[0].dateBumped).toBe(true);
  });

  it("bumps date +1 for 02:30 game when flag is ON", () => {
    const text = `📅 Dia 04/04

LA Galaxy x Inter Miami
🏆 MLS
⏰ 02h30
📺 Apple TV`;
    const result = parseScheduleText(text, "2026-04-04", BUMP);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-05");
    expect(result[0].dateBumped).toBe(true);
  });

  it("does NOT bump date for 05:00+ games even with flag ON", () => {
    const text = `📅 Dia 04/04

Arsenal x Chelsea
🏆 Premier League
⏰ 08h30
📺 ESPN`;
    const result = parseScheduleText(text, "2026-04-04", BUMP);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-04");
    expect(result[0].dateBumped).toBeFalsy();
  });

  it("does NOT bump when date is from fallback (manual picker)", () => {
    const text = `Santos Laguna x América-MEX
🏆 Liga MX
⏰ 00h00
📺 ESPN`;
    const result = parseScheduleText(text, "2026-04-05", BUMP);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-05");
    expect(result[0].dateBumped).toBeFalsy();
  });

  it("handles mixed dawn and normal games correctly with flag ON", () => {
    const text = `📅 Dia 04/04

Flamengo x Palmeiras
🏆 Brasileirão
⏰ 21h00
📺 Globo

Santos Laguna x América-MEX
🏆 Liga MX
⏰ 00h00
📺 ESPN`;
    const result = parseScheduleText(text, "2026-04-04", BUMP);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-04-04");
    expect(result[0].dateBumped).toBeFalsy();
    expect(result[1].date).toBe("2026-04-05");
    expect(result[1].dateBumped).toBe(true);
  });

  it("DEFAULT (flag OFF): madrugada keeps the header date — prevents the 02/05 bug", () => {
    const text = `📅 Dia 04/04

Formula E - GP de Miami - Treino
🏎️ Automobilismo
⏰ 04h30
📺 Band Sports`;
    const result = parseScheduleText(text, "2026-04-04");
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-04");
    expect(result[0].dateBumped).toBeFalsy();
  });
});

describe("parseScheduleText - separadores de canais", () => {
  it("divide canais separados por '/' (Globo / Paramount+)", () => {
    const text = `Flamengo x Palmeiras
⚽ Brasileirão / ⏰ 16h00
📺 Globo / Paramount+`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].channels).toEqual(["Globo", "Paramount+"]);
  });

  it("divide canais separados por '|'", () => {
    const text = `Lakers x Warriors
🏀 NBA / ⏰ 22h00
📺 ESPN | NBA League Pass`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].channels).toEqual(["ESPN", "NBA League Pass"]);
  });

  it("divide canais combinando ',' '/' e ' e '", () => {
    const text = `Time A x Time B
⚽ Liga / ⏰ 20h00
📺 Globo / SporTV, ESPN e TNT`;
    const games = parseScheduleText(text, "2026-04-01");
    expect(games).toHaveLength(1);
    expect(games[0].channels).toEqual(["Globo", "SporTV", "ESPN", "TNT"]);
  });
});

describe("parseScheduleText - Formato C (inline com travessão)", () => {
  it("detecta jogo de basquete inline 'Time x Time — Canal — HH:MM'", () => {
    const text = `🏀 Basquete — Jogos do Dia (09/05)

WNBA

Dallas Wings x Indiana Fever — ESPN 3 — 14:00`;
    const games = parseScheduleText(text, "2026-05-09");
    expect(games).toHaveLength(1);
    expect(games[0].home_team).toBe("Dallas Wings");
    expect(games[0].away_team).toBe("Indiana Fever");
    expect(games[0].competition).toBe("WNBA");
    expect(games[0].game_time).toBe("14:00");
    expect(games[0].channels).toEqual(["ESPN 3"]);
    expect(games[0].sport_type).toBe("basketball");
    expect(games[0].date).toBe("2026-05-09");
  });

  it("captura data do cabeçalho de seção (09/05)", () => {
    const text = `🏀 Basquete — Jogos do Dia (09/05)
NBA
Lakers x Warriors — ESPN 2 — 21:30`;
    const games = parseScheduleText(text, "2026-01-01");
    expect(games[0].date).toMatch(/-05-09$/);
  });

  it("detecta evento sem adversário com detalhe (MotoGP Sprint Race)", () => {
    const text = `🏁 Automobilismo — Agenda (09/05)
MotoGP
GP da França — Sprint Race — ESPN 4 — 10:00`;
    const games = parseScheduleText(text, "2026-05-09");
    expect(games).toHaveLength(1);
    expect(games[0].home_team).toBe("GP da França");
    expect(games[0].away_team).toBe("");
    expect(games[0].competition).toBe("MotoGP");
    expect(games[0].competition_detail).toBe("Sprint Race");
    expect(games[0].game_time).toBe("10:00");
    expect(games[0].channels).toEqual(["ESPN 4"]);
  });

  it("detecta múltiplas sessões de um mesmo evento (Italian Open)", () => {
    const text = `🎾 Tênis — Agenda (09/05)
Italian Open
06:00 — ESPN 2
10:00 — ESPN 2`;
    const games = parseScheduleText(text, "2026-05-09");
    expect(games).toHaveLength(2);
    expect(games[0].home_team).toBe("Italian Open");
    expect(games[0].game_time).toBe("06:00");
    expect(games[1].game_time).toBe("10:00");
    expect(games[0].sport_type).toBe("tennis");
  });

  it("detecta luta de boxe inline", () => {
    const text = `🥊 Combate
Boxe
Angelo Leo x Ra'eese Aleem — ESPN 3 — 21:00`;
    const games = parseScheduleText(text, "2026-05-09");
    expect(games).toHaveLength(1);
    expect(games[0].home_team).toBe("Angelo Leo");
    expect(games[0].away_team).toContain("Aleem");
    expect(games[0].competition).toBe("Boxe");
    expect(games[0].game_time).toBe("21:00");
  });

  it("preserva formato A puro inalterado", () => {
    const text = `📅**Dia 20/03**

Flamengo x Palmeiras
🏆 Brasileirão / ⏰ 19h00
📺 SporTV`;
    const games = parseScheduleText(text, "2026-03-20");
    expect(games).toHaveLength(1);
    expect(games[0].home_team).toBe("Flamengo");
    expect(games[0].away_team).toBe("Palmeiras");
    expect(games[0].competition).toBe("Brasileirão");
  });

  it("processa o texto completo do usuário (basquete+moto+boxe+tênis+golfe)", () => {
    const text = `🏀 Basquete — Jogos do Dia (09/05)

WNBA
Dallas Wings x Indiana Fever — ESPN 3 — 14:00
Phoenix Mercury x Las Vegas Aces — Disney+ — 16:30

NBA
Detroit Pistons x Cleveland Cavaliers — ESPN 4 — 16:00
Oklahoma City Thunder x Los Angeles Lakers — ESPN 2 — 21:30

NBB
Corinthians x Minas — ESPN 4 — 19:00

---

🏁 Automobilismo — Agenda (09/05)
Moto3
GP da França — Free Practice — ESPN 4 — 03:35

MotoGP
GP da França — Free Practice — ESPN 4 — 05:10
GP da França — Qualificação — ESPN 4 — 05:50
GP da França — Sprint Race — ESPN 4 — 10:00

Moto2
GP da França — Qualificação — ESPN 4 — 08:40

---

🥊 Combate
Boxe
Angelo Leo x Ra'eese Aleem — ESPN 3 — 21:00

---

🎾 Tênis — Agenda (09/05)
Italian Open
06:00 — ESPN 2
10:00 — ESPN 2

---

⛳ Golfe
PGA Tour — Terceira Rodada
14:00 — ESPN 3
16:00 — ESPN 3

📞 Contato: (11) 94075-9046`;
    const games = parseScheduleText(text, "2026-05-09");
    // 5 basquete + 5 motos + 1 boxe + 2 tênis + 2 golfe = 15
    expect(games.length).toBeGreaterThanOrEqual(14);
    const sports = new Set(games.map(g => g.sport_type));
    expect(sports.has("basketball")).toBe(true);
    expect(sports.has("tennis")).toBe(true);
    expect(sports.has("golf")).toBe(true);
    // PGA Tour event has detail
    const pga = games.find(g => g.home_team === "PGA Tour");
    expect(pga?.competition_detail).toBe("Terceira Rodada");
  });
});
