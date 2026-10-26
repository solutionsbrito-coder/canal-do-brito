import { describe, it, expect } from "vitest";
import { isNonAdversarial, detectSportType } from "@/lib/gameUtils";

/**
 * Regras de evento único (sem confronto) usadas pelo formulário do admin:
 * - away_team é opcional; grava string vazia
 * - validação exige apenas nome do evento + horário HH:MM
 * - exibição só mostra "x" quando existe visitante
 */
function validate(home: string, time: string) {
  if (!home.trim()) return "Informe o nome do evento.";
  if (!/^\d{2}:\d{2}$/.test(time)) return "Informe um horário válido (HH:MM).";
  return null;
}

function displayTitle(g: { home_team: string; away_team?: string }) {
  return g.away_team?.trim() ? `${g.home_team} x ${g.away_team}` : g.home_team;
}

describe("evento único no admin", () => {
  it("aceita evento sem visitante", () => {
    expect(validate("Kings League — Rodada 5", "20:00")).toBeNull();
    expect(validate("UFC 300", "23:00")).toBeNull();
  });

  it("rejeita horário inválido e nome vazio", () => {
    expect(validate("", "20:00")).toBe("Informe o nome do evento.");
    expect(validate("GP do Brasil", "2000")).toBe("Informe um horário válido (HH:MM).");
  });

  it("não mostra 'x' quando não há visitante", () => {
    expect(displayTitle({ home_team: "GP do Brasil", away_team: "" })).toBe("GP do Brasil");
    expect(displayTitle({ home_team: "GP do Brasil" })).toBe("GP do Brasil");
    expect(displayTitle({ home_team: "Flamengo", away_team: "Palmeiras" })).toBe("Flamengo x Palmeiras");
  });

  it("esportes não-adversariais são reconhecidos", () => {
    for (const s of ["f1", "mma", "surf", "cycling", "swimming", "golf", "tennis"] as const) {
      expect(isNonAdversarial(s)).toBe(true);
    }
    expect(isNonAdversarial("football")).toBe(false);
  });

  it("detecta esporte apenas com o nome do evento", () => {
    expect(detectSportType("UFC 300", "UFC 300")).toBe("mma");
  });
});
