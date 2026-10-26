import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminSeries from "../AdminSeries";

const searchMock = vi.fn();
const setResultsMock = vi.fn();
const fetchDetailsMock = vi.fn(async () => ({ genres: [{ id: 1, name: "Drama" }], vote_average: 9, overview: "x", backdrop_path: "/bk.jpg" }));
const addMutateAsync = vi.fn(async () => ({}));
const toggleMutate = vi.fn();
const deleteMutate = vi.fn();
const updateMutateAsync = vi.fn(async () => ({}));

let tmdbResults: any[] = [];
let seriesList: any[] = [];

vi.mock("@/hooks/useTMDB", () => ({
  useTMDBSearch: () => ({
    results: tmdbResults,
    loading: false,
    search: searchMock,
    setResults: setResultsMock,
    fetchDetails: fetchDetailsMock,
  }),
}));

vi.mock("@/hooks/useSeries", () => ({
  useAllSeries: () => ({ data: seriesList }),
  useAddSeries: () => ({ mutateAsync: addMutateAsync }),
  useToggleSeries: () => ({ mutate: toggleMutate }),
  useDeleteSeries: () => ({ mutate: deleteMutate }),
  useUpdateSeries: () => ({ mutateAsync: updateMutateAsync }),
  useReorderSeries: () => ({ mutate: vi.fn() }),
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

describe("AdminSeries", () => {
  beforeEach(() => {
    tmdbResults = [];
    seriesList = [];
    searchMock.mockClear();
  });

  it("renderiza header e estado vazio", () => {
    wrap(<AdminSeries />);
    expect(screen.getByText("Buscar Séries")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma série adicionada.")).toBeInTheDocument();
    expect(screen.getByText(/0 ativas \/ 0/)).toBeInTheDocument();
  });

  it("dispara busca TMDB ao pressionar Enter", () => {
    wrap(<AdminSeries />);
    const input = screen.getByPlaceholderText("Nome da série...");
    fireEvent.change(input, { target: { value: "Lost" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(searchMock).toHaveBeenCalledWith("search_tv", "Lost");
  });

  it("alterna para aba 'Populares'", () => {
    wrap(<AdminSeries />);
    fireEvent.click(screen.getByText("Populares"));
    expect(searchMock).toHaveBeenCalledWith("popular_tv");
  });

  it("renderiza listagem com título e badge de ativas", () => {
    seriesList = [
      { id: "1", tmdb_id: 1, title: "Breaking Bad", active: true, genre: "Drama", poster_url: null, year: 2008, rating: 9.5, backdrop_url: "x" },
      { id: "2", tmdb_id: 2, title: "Lost", active: true, genre: "Mistério", poster_url: null, year: 2004, rating: 8.5, backdrop_url: "y" },
    ];
    wrap(<AdminSeries />);
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
    expect(screen.getByText(/2 ativas \/ 2/)).toBeInTheDocument();
  });

  it("mostra alerta de séries incompletas", () => {
    seriesList = [{ id: "1", tmdb_id: 1, title: "X", active: true, genre: null, backdrop_url: null }];
    wrap(<AdminSeries />);
    expect(screen.getByText(/1 incompletas/)).toBeInTheDocument();
  });
});
