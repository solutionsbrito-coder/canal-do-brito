import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminNovidades from "../AdminNovidades";

const searchMock = vi.fn();
const setResultsMock = vi.fn();
const fetchDetailsMock = vi.fn(async () => ({ genres: [{ id: 1, name: "Ação" }], vote_average: 8, overview: "x", backdrop_path: "/bk.jpg", runtime: 120 }));
const addMutateAsync = vi.fn(async () => ({}));
const toggleMutate = vi.fn();
const deleteMutate = vi.fn();
const updateMutate = vi.fn();
const updateMutateAsync = vi.fn(async () => ({}));

let tmdbResults: any[] = [];
let itemList: any[] = [];

vi.mock("@/hooks/useTMDB", () => ({
  useTMDBSearch: () => ({
    results: tmdbResults,
    loading: false,
    search: searchMock,
    setResults: setResultsMock,
    fetchDetails: fetchDetailsMock,
  }),
}));

vi.mock("@/hooks/useNewsReleases", () => ({
  useAllNewsReleases: () => ({ data: itemList, isLoading: false }),
  useAddNewsRelease: () => ({ mutateAsync: addMutateAsync }),
  useToggleNewsRelease: () => ({ mutate: toggleMutate }),
  useDeleteNewsRelease: () => ({ mutate: deleteMutate }),
  useReorderNewsReleases: () => ({ mutate: vi.fn() }),
  useUpdateNewsRelease: () => ({ mutate: updateMutate, mutateAsync: updateMutateAsync }),
}));

vi.mock("@/hooks/useRealtimeContent", () => ({
  useRealtimeSeries: () => undefined,
  useRealtimeNewsReleases: () => undefined,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const baseItem = (overrides: any = {}) => ({
  id: "1", tmdb_id: 100, title: "Duna 2", active: true,
  content_type: "movie", badge_type: "novidade", image_url: null, backdrop_url: null,
  year: 2024, genres: "Ficção", display_order: 0, runtime: 165, seasons: null,
  overview: null, rating: 8.2, tagline: null, added_by: null, created_at: "2026-01-01",
  ...overrides,
});

describe("AdminNovidades", () => {
  beforeEach(() => {
    tmdbResults = [];
    itemList = [];
    searchMock.mockClear();
    addMutateAsync.mockClear();
    updateMutate.mockClear();
    updateMutateAsync.mockClear();
    deleteMutate.mockClear();
    toggleMutate.mockClear();
  });

  it("renderiza header de busca e estado vazio sem stats bar", () => {
    wrap(<AdminNovidades />);
    expect(screen.getByText("Buscar Conteúdo")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma novidade adicionada.")).toBeInTheDocument();
  });

  it("dispara busca de filme via Enter", () => {
    wrap(<AdminNovidades />);
    const input = screen.getByPlaceholderText("Nome do filme...");
    fireEvent.change(input, { target: { value: "Avatar" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(searchMock).toHaveBeenCalledWith("search_movie", "Avatar");
  });

  it("renderiza item adicionado e stats bar (Total/Ativos)", () => {
    itemList = [baseItem()];
    wrap(<AdminNovidades />);
    expect(screen.getByText("Duna 2")).toBeInTheDocument();
    expect(screen.getAllByText("🎬 Filme").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Ativos")).toBeInTheDocument();
    expect(screen.getByText("Ficção")).toBeInTheDocument();
  });

  it("destaca itens sem gênero com botão de batch update", () => {
    itemList = [
      baseItem({ id: "1", tmdb_id: 1, title: "X", genres: null }),
      baseItem({ id: "2", tmdb_id: 2, title: "Y", content_type: "series", genres: null, display_order: 1 }),
    ];
    wrap(<AdminNovidades />);
    expect(screen.getByText(/2 sem gênero/)).toBeInTheDocument();
    expect(screen.getAllByText("sem gênero").length).toBe(2);
  });

  it("filtra a lista por busca de título (debounced)", async () => {
    itemList = [
      baseItem({ id: "1", title: "Duna 2" }),
      baseItem({ id: "2", title: "Outro Filme", display_order: 1 }),
    ];
    wrap(<AdminNovidades />);
    const search = screen.getByPlaceholderText("Buscar por título ou gênero...");
    fireEvent.change(search, { target: { value: "duna" } });
    await waitFor(() => {
      expect(screen.queryByText("Outro Filme")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Duna 2")).toBeInTheDocument();
  });

  it("filtra por chip 'Sem gênero'", () => {
    itemList = [
      baseItem({ id: "1", title: "Com gênero" }),
      baseItem({ id: "2", title: "Sem gênero item", genres: null, display_order: 1 }),
    ];
    wrap(<AdminNovidades />);
    fireEvent.click(screen.getByRole("button", { name: /^Sem gênero · 1$/ }));
    expect(screen.getByText("Sem gênero item")).toBeInTheDocument();
    expect(screen.queryByText("Com gênero")).not.toBeInTheDocument();
  });

  it("abre AlertDialog antes de deletar e confirma", async () => {
    itemList = [baseItem()];
    wrap(<AdminNovidades />);
    fireEvent.click(screen.getByLabelText("Remover Duna 2"));
    expect(await screen.findByText("Remover item?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith("1"));
  });

  it("handleAdd chama mutateAsync com payload correto", async () => {
    tmdbResults = [{ id: 555, title: "Novo Filme", poster_path: "/p.jpg", overview: "ov", vote_average: 7.5, release_date: "2026-03-01" }];
    wrap(<AdminNovidades />);
    fireEvent.click(screen.getByLabelText(/Adicionar Novo Filme/));
    await waitFor(() => expect(addMutateAsync).toHaveBeenCalled());
    const payload: any = (addMutateAsync.mock.calls as any[])[0][0];
    expect(payload.tmdb_id).toBe(555);
    expect(payload.title).toBe("Novo Filme");
    expect(payload.content_type).toBe("movie");
    expect(payload.year).toBe(2026);
    expect(payload.genres).toBe("Ação");
  });

  it("guard duplicado: não chama mutateAsync se já existe", async () => {
    itemList = [baseItem({ tmdb_id: 555, content_type: "movie" })];
    tmdbResults = [{ id: 555, title: "Duplicado", poster_path: null, overview: null, vote_average: 5 }];
    wrap(<AdminNovidades />);
    const btn = screen.getByLabelText(/já adicionado|Adicionar Duplicado/i);
    expect(btn).toBeDisabled();
  });
});
