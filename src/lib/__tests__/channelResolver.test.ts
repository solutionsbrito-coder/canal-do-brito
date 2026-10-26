import { describe, it, expect } from "vitest";
import { resolveChannel, resolveChannels, normalizeChannelList } from "@/lib/channelResolver";
import type { ChannelMapping } from "@/hooks/useChannelMappings";

const mk = (name: string, extra: Partial<ChannelMapping> = {}): ChannelMapping => ({
  id: name,
  name,
  name_normalized: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ""),
  logo_key: "none",
  short: null,
  active: true,
  ...extra,
});

const mappings = new Map<string, ChannelMapping>();
const espn2 = mk("ESPN 2", { logo_key: "espn" });
mappings.set("espn2", espn2);
mappings.set("espn2hd", espn2); // alias
const premiere = mk("Premiere");
mappings.set("premiere", premiere);
mappings.set("pfc", premiere); // alias

describe("resolveChannel — sem cadastro (regras embutidas)", () => {
  const cases: Array<[string, string]> = [
    ["ESPN2", "ESPN 2"],
    ["Espn 2", "ESPN 2"],
    ["ESPN 2 HD", "ESPN 2"],
    ["ESPN3", "ESPN 3"],
    ["ESPN4", "ESPN 4"],
    ["Sportv", "SporTV"],
    ["SPORTV", "SporTV"],
    ["Spor TV", "SporTV"],
    ["SporTV 1", "SporTV"],
    ["SporTV2", "SporTV 2"],
    ["SporTV3", "SporTV 3"],
    ["Premiere FC", "Premiere"],
    ["Disney Plus", "Disney+"],
    ["DisneyPlus", "Disney+"],
    ["Disney +", "Disney+"],
    ["Youtube", "YouTube"],
    ["You Tube", "YouTube"],
    ["Cazé TV", "CazéTV"],
    ["CazeTV", "CazéTV"],
    ["Band Sports", "BandSports"],
    ["BANDSPORTS", "BandSports"],
  ];
  it.each(cases)("%s → %s", (input, expected) => {
    const r = resolveChannel(input);
    expect(r.name).toBe(expected);
    expect(r.status).toBe("canonical");
  });

  it("mantém texto original e marca desconhecido", () => {
    const r = resolveChannel("Canal Estranho XYZ");
    expect(r.status).toBe("unknown");
    expect(r.name).toBe("Canal Estranho XYZ");
    expect(r.changed).toBe(false);
  });
});

describe("resolveChannel — com cadastro", () => {
  it("prioriza nome oficial cadastrado", () => {
    const r = resolveChannel("espn 2", mappings);
    expect(r.status).toBe("official");
    expect(r.mapping).toBe(espn2);
    expect(r.name).toBe("ESPN 2");
  });
  it("resolve por alias", () => {
    const r = resolveChannel("PFC", mappings);
    expect(r.status).toBe("alias");
    expect(r.name).toBe("Premiere");
    expect(r.changed).toBe(true);
  });
  it("remove sufixo HD e acha o cadastro", () => {
    expect(resolveChannel("ESPN2 HD", mappings).mapping).toBe(espn2);
  });
  it("regra canônica cai no cadastro quando existe", () => {
    const r = resolveChannel("Premiere Clubes", mappings);
    expect(r.mapping).toBe(premiere);
  });
});

describe("resolveChannels / normalizeChannelList", () => {
  it("deduplica após normalizar", () => {
    expect(normalizeChannelList(["ESPN2", "ESPN 2", "Espn 2 HD", "Globo"], mappings)).toEqual(["ESPN 2", "Globo"]);
  });
  it("ignora vazios", () => {
    expect(resolveChannels(["", "  ", null as unknown as string, "Globo"])).toHaveLength(1);
  });
});
