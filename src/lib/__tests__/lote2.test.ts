import { describe, it, expect, beforeEach } from "vitest";
import {
  buildFilteredAgendaUrl,
  parseAgendaUrlFilters,
  serializeAgendaUrlFilters,
} from "@/lib/urlFilters";
import {
  buildCatalogCarousels,
  isLeavingSoon,
  onlyAvailable,
  toCatalogTitle,
} from "@/lib/catalogCarousels";
import {
  findListaItem,
  loadMinhaLista,
  removeListaItem,
  upsertListaItem,
  MINHA_LISTA_STORAGE_KEY,
} from "@/lib/minhaLista";

describe("Filtros da agenda na URL (Lote 2)", () => {
  it("lê esporte, time e competição da URL", () => {
    const f = parseAgendaUrlFilters(
      new URLSearchParams("esporte=basketball&time=Palmeiras&competicao=Brasileirão"),
    );
    expect(f.esporte).toBe("basketball");
    expect(f.time).toBe("Palmeiras");
    expect(f.competicao).toBe("Brasileirão");
  });

  it("ignora esporte/status/ordem inválidos sem quebrar", () => {
    const f = parseAgendaUrlFilters(
      new URLSearchParams("esporte=quatloos&status=banana&ordem=zig"),
    );
    expect(f.esporte).toBe("all");
    expect(f.status).toBe("all");
    expect(f.ordem).toBe("time");
  });

  it("serializa só o que difere do padrão e monta o link filtrado", () => {
    const f = parseAgendaUrlFilters(new URLSearchParams("esporte=basketball&time=NBA"));
    // time=NBA não é time; o parse guarda o texto — o filtro de time
    // casa por nome, e o link continua válido.
    expect(serializeAgendaUrlFilters(f).toString()).toBe("esporte=basketball&time=NBA");
    expect(
      buildFilteredAgendaUrl("https://canaldobrito.site", "/programacao", f, null),
    ).toBe("https://canaldobrito.site/programacao?esporte=basketball&time=NBA");
    expect(
      buildFilteredAgendaUrl(
        "https://canaldobrito.site",
        "/programacao",
        { esporte: "all", status: "all", ordem: "time", canal: null, q: "", time: "", competicao: "" },
        null,
      ),
    ).toBe("https://canaldobrito.site/programacao");
  });
});

const movie = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  title: "Filme X",
  poster_url: null,
  year: 2025,
  genre: "Ação",
  created_at: "2026-10-26T00:00:00Z",
  ...over,
});

describe("Carrosséis do catálogo próprio (Lote 2)", () => {
  it("nunca inclui título fora do catálogo como disponível", () => {
    const all = [
      toCatalogTitle("movie", movie({ id: "ok" })),
      toCatalogTitle("movie", movie({ id: "fora", available_in_catalog: false })),
      toCatalogTitle("movie", movie({ id: "antigo" })), // null = padrão true (Lote 1)
    ];
    expect(onlyAvailable(all).map((t) => t.id)).toEqual(["ok", "antigo"]);
  });

  it("em alta só com destaque; maratonar prefere séries", () => {
    const c = buildCatalogCarousels(
      [movie({ id: "f1", featured: true })],
      [movie({ id: "s1", created_at: "2026-10-25T00:00:00Z" })],
    );
    expect(c.emAlta.map((t) => t.id)).toEqual(["f1"]);
    expect(c.maratonar.map((t) => t.id)).toEqual(["s1"]);
    expect(c.novos[0].id).toBe("f1"); // mais recente primeiro
  });

  it("sai em breve: hoje e próximos 14 dias, não depois nem passado", () => {
    expect(isLeavingSoon("2026-10-26", 14, "2026-10-26")).toBe(true);
    expect(isLeavingSoon("2026-11-09", 14, "2026-10-26")).toBe(true);
    expect(isLeavingSoon("2026-11-10", 14, "2026-10-26")).toBe(false);
    expect(isLeavingSoon("2026-10-25", 14, "2026-10-26")).toBe(false);
    expect(isLeavingSoon(null, 14, "2026-10-26")).toBe(false);
  });
});

describe("Minha lista sem login (Lote 2)", () => {
  beforeEach(() => {
    window.localStorage.removeItem(MINHA_LISTA_STORAGE_KEY);
  });

  it("insere, atualiza status, remove e persiste no dispositivo", () => {
    let items = loadMinhaLista();
    expect(items).toEqual([]);
    items = upsertListaItem(items, {
      kind: "movie", id: "m1", title: "Filme X", poster_url: null, status: "want",
    });
    expect(findListaItem(items, "movie", "m1")?.status).toBe("want");
    items = upsertListaItem(items, {
      kind: "movie", id: "m1", title: "Filme X", poster_url: null, status: "watched",
    });
    expect(items).toHaveLength(1);
    expect(findListaItem(items, "movie", "m1")?.status).toBe("watched");
    window.localStorage.setItem(MINHA_LISTA_STORAGE_KEY, JSON.stringify(items));
    expect(loadMinhaLista()).toHaveLength(1);
    items = removeListaItem(items, "movie", "m1");
    expect(items).toEqual([]);
  });

  it("ignora registro corrompido no storage sem quebrar", () => {
    window.localStorage.setItem(MINHA_LISTA_STORAGE_KEY, JSON.stringify([{ kind: "x" }]));
    expect(loadMinhaLista()).toEqual([]);
  });
});
