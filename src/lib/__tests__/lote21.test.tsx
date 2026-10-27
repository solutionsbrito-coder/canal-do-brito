import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseAgendaUrlFilters, serializeAgendaUrlFilters } from "@/lib/urlFilters";
import { SLUG_TO_TAB, TAB_SLUGS } from "@/lib/utils";

// MinhaListaSection vazia (Lote 2.1): hooks mockados para lista vazia e
// catálogo vazio, sem tocar em banco ou localStorage real.
vi.mock("@/hooks/useMinhaLista", () => ({
  useMinhaLista: () => ({ items: [], remove: vi.fn(), get: () => undefined, setStatus: vi.fn() }),
}));
vi.mock("@/hooks/useMovies", () => ({ useActiveMovies: () => ({ data: [] }) }));
vi.mock("@/hooks/useSeries", () => ({ useActiveSeries: () => ({ data: [] }) }));

import { MinhaListaSection } from "@/components/public/CatalogCarousels";

describe("Lote 2.1 — filtros na URL", () => {
  it("preserva esporte, time e competição vindos da URL", () => {
    const f = parseAgendaUrlFilters(
      new URLSearchParams("esporte=basketball&time=Palmeiras&competicao=Brasileir%C3%A3o"),
    );
    expect(f.esporte).toBe("basketball");
    expect(f.time).toBe("Palmeiras");
    expect(f.competicao).toBe("Brasileirão");
  });

  it("serializa esporte/time/competição para o link copiado", () => {
    const qs = serializeAgendaUrlFilters({
      esporte: "basketball",
      status: "all",
      ordem: "time",
      canal: null,
      q: "",
      time: "Palmeiras",
      competicao: "",
    }).toString();
    expect(qs).toContain("esporte=basketball");
    expect(qs).toContain("time=Palmeiras");
  });

  it("esporte desconhecido volta para all, sem quebrar", () => {
    expect(parseAgendaUrlFilters(new URLSearchParams("esporte=quatermass")).esporte).toBe("all");
  });
});

describe("Lote 2.1 — slug de Meu Canal", () => {
  it("mapeia /meus-jogos para a aba meucanal (contrato da rota explícita no App)", () => {
    expect(SLUG_TO_TAB["meus-jogos"]).toBe("meucanal");
    expect(TAB_SLUGS.meucanal).toBe("meus-jogos");
  });
});

describe("Lote 2.1 — Minha lista vazia visível", () => {
  it("renderiza a seção vazia em vez de null, sem títulos inventados", () => {
    render(<MinhaListaSection />);
    expect(screen.getByRole("heading", { name: /minha lista/i })).toBeInTheDocument();
    expect(screen.getByText(/ainda não salvou nenhum título/i)).toBeInTheDocument();
    expect(screen.getByText(/sem login/i)).toBeInTheDocument();
  });
});
