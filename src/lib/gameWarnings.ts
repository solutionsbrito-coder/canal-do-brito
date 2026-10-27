/**
 * Avisos de duplicata / conflito de horário na inserção de jogos (Lote 1).
 *
 * NUNCA bloqueia à força: apenas lista o que já existe e pede
 * confirmação do admin. O insert em lote (ProgramacaoTexto) já ignora
 * duplicatas em silêncio; aqui, no cadastro avulso, o admin vê o
 * conflito antes de decidir inserir mesmo assim.
 *
 * - Duplicata: mesma data + mesmo confronto (ordem dos times não
 *   importa: "A x B" e "B x A" são o mesmo confronto para o visitante).
 * - Conflito de horário: mesma data + mesmo horário, confronto
 *   diferente (o visitante veria dois jogos no mesmo horário — pode
 *   ser legítimo, por isso é só aviso).
 * Jogos arquivados não contam.
 */

export interface ExistingGameLike {
  id?: string;
  date: string;
  home_team: string;
  away_team: string;
  game_time: string;
}

export interface GameWarnings {
  duplicates: string[];
  timeConflicts: string[];
}

function normTeam(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function describe(g: ExistingGameLike): string {
  const teams = g.away_team ? `${g.home_team} x ${g.away_team}` : g.home_team;
  return `${teams} às ${(g.game_time || "").slice(0, 5)}`;
}

export function findGameWarnings(
  existing: ExistingGameLike[],
  candidate: { date: string; home_team: string; away_team: string; game_time: string },
  excludeId?: string,
): GameWarnings {
  const home = normTeam(candidate.home_team);
  const away = normTeam(candidate.away_team);
  const time = (candidate.game_time || "").slice(0, 5);
  const duplicates: string[] = [];
  const timeConflicts: string[] = [];

  for (const g of existing) {
    if (excludeId && g.id === excludeId) continue;
    if (g.date !== candidate.date) continue;
    const gh = normTeam(g.home_team);
    const ga = normTeam(g.away_team);
    const sameConfronto =
      (gh === home && ga === away) || (away !== "" && gh === away && ga === home);
    if (sameConfronto) {
      duplicates.push(describe(g));
      continue;
    }
    if ((g.game_time || "").slice(0, 5) === time) {
      timeConflicts.push(describe(g));
    }
  }
  return { duplicates, timeConflicts };
}

export function hasWarnings(w: GameWarnings): boolean {
  return w.duplicates.length > 0 || w.timeConflicts.length > 0;
}
