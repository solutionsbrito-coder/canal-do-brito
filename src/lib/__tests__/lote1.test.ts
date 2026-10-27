import { describe, it, expect } from "vitest";
import {
  loadMeuCanalPrefs,
  matchesFollowed,
  toggleFollowCompetition,
  toggleFollowSport,
  toggleFollowTeam,
  MEU_CANAL_STORAGE_KEY,
  type MeuCanalPrefs,
} from "@/lib/meuCanal";
import { findGameWarnings } from "@/lib/gameWarnings";
import { buildGameIcs } from "@/lib/ics";
import { missingCatalogFields, normalizeCatalogFields } from "@/lib/catalogFields";

const game = {
  home_team: "Palmeiras",
  away_team: "Flamengo",
  competition: "Brasileirão",
  sport: "football",
};

describe("Meu Canal (sem login, localStorage)", () => {
  it("não casa nada sem follows", () => {
    expect(matchesFollowed(game, { teams: [], sports: [], competitions: [] })).toBe(false);
  });

  it("casa por time, esporte e competição, sem acento/maiúscula", () => {
    expect(matchesFollowed(game, { teams: ["palmeiras"], sports: [], competitions: [] })).toBe(true);
    expect(matchesFollowed(game, { teams: [], sports: ["football"], competitions: [] })).toBe(true);
    expect(matchesFollowed(game, { teams: [], sports: [], competitions: ["brasileirao"] })).toBe(true);
    expect(matchesFollowed(game, { teams: ["Corinthians"], sports: [], competitions: [] })).toBe(false);
  });

  it("toggle liga/desliga e persiste em localStorage", () => {
    localStorage.clear();
    let prefs: MeuCanalPrefs = { teams: [], sports: [], competitions: [] };
    prefs = toggleFollowTeam(prefs, "Palmeiras");
    expect(prefs.teams).toEqual(["Palmeiras"]);
    prefs = toggleFollowTeam(prefs, "palmeiras");
    expect(prefs.teams).toEqual([]);
    prefs = toggleFollowSport(prefs, "football");
    prefs = toggleFollowCompetition(prefs, "Brasileirão");
    expect(prefs.sports).toEqual(["football"]);
    expect(prefs.competitions).toEqual(["Brasileirão"]);
    localStorage.setItem(MEU_CANAL_STORAGE_KEY, JSON.stringify(prefs));
    expect(loadMeuCanalPrefs()).toEqual(prefs);
  });
});

describe("Avisos de duplicata / conflito (admin)", () => {
  const existing = [
    { id: "1", date: "2026-10-26", home_team: "Palmeiras", away_team: "Flamengo", game_time: "21:00" },
    { id: "2", date: "2026-10-26", home_team: "Santos", away_team: "Corinthians", game_time: "16:00" },
  ];

  it("detecta duplicata mesmo com times invertidos", () => {
    const w = findGameWarnings(existing, {
      date: "2026-10-26", home_team: "Flamengo", away_team: "Palmeiras", game_time: "21:00",
    });
    expect(w.duplicates.length).toBe(1);
    expect(w.timeConflicts.length).toBe(0);
  });

  it("detecta conflito de horário com outro confronto", () => {
    const w = findGameWarnings(existing, {
      date: "2026-10-26", home_team: "Grêmio", away_team: "Inter", game_time: "16:00",
    });
    expect(w.duplicates.length).toBe(0);
    expect(w.timeConflicts.length).toBe(1);
  });

  it("não avisa para outro dia nem outro horário", () => {
    const w = findGameWarnings(existing, {
      date: "2026-10-27", home_team: "Palmeiras", away_team: "Flamengo", game_time: "21:00",
    });
    expect(w.duplicates.length).toBe(0);
    expect(w.timeConflicts.length).toBe(0);
  });
});

describe("ICS por jogo", () => {
  it("gera evento com fuso de Brasília, sem link externo", () => {
    const ics = buildGameIcs({
      id: "g1", date: "2026-10-26", game_time: "21:30",
      home_team: "Palmeiras", away_team: "Flamengo",
      competition: "Brasileirão", channels: ["Globo"], sport_type: "football",
    });
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20261026T213000");
    expect(ics).toContain("SUMMARY:Palmeiras x Flamengo");
    expect(ics).toContain("Canal do Brito");
    expect(ics).not.toContain("netflix");
    expect(ics).not.toContain("primevideo");
  });
});

describe("Campos de catálogo próprio", () => {
  it("títulos antigos ganham padrões sensatos", () => {
    expect(normalizeCatalogFields(null)).toEqual({
      available_in_catalog: true,
      catalog_category: null,
      internal_link: null,
      featured: false,
      leaves_at: null,
    });
  });

  it("categoria e link são obrigatórios só quando disponível", () => {
    expect(missingCatalogFields(normalizeCatalogFields(null)).length).toBe(2);
    expect(missingCatalogFields({
      available_in_catalog: false, catalog_category: null, internal_link: null, featured: false, leaves_at: null,
    })).toEqual([]);
    expect(missingCatalogFields({
      available_in_catalog: true, catalog_category: "Ação", internal_link: "app/filme-1", featured: true, leaves_at: null,
    })).toEqual([]);
  });
});
