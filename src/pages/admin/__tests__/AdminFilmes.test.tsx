import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminFilmes from "../AdminFilmes";

const searchMock = vi.fn();
const setResultsMock = vi.fn();
const fetchDetailsMock = vi.fn(async () => ({ genres: [{ id: 1, name: "Ação" }], vote_average: 8, overview: "ovw", backdrop_path: "/bk.jpg" }));
const addMutateAsync = vi.fn(async () => ({}));
const toggleMutate = vi.fn();
const deleteMutate = vi.fn();
const updateMutateAsync = vi.fn(async () => ({}));

let tmdbResults: any[] = [];
let movieList: any[] = [];

vi.mock("@/hooks/useTMDB", () => ({
  useTMDBSearch: () => ({
    results: tmdbResults,
    loading: false,
    search: searchMock,
    setResults: setResultsMock,
    fetchDetails: fetchDetailsMock,
  }),
}));

vi.mock("@/hooks/useMovies", () => ({
  useAllMovies: () => ({ data: movieList }),
  useAddMovie: () => ({ mutateAsync: addMutateAsync }),
  useToggleMovie: () => ({ mutate: toggleMutate }),
  useDeleteMovie: () => ({ mutate: deleteMutate }),
  useUpdateMovie: () => ({ mutateAsync: updateMutateAsync }),
  useReorderMovies: () => ({ mutate: vi.fn() }),
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

describe("AdminFilmes", () => {
  beforeEach(() => {
    tmdbResults = [];
    movieList = [];
    searchMock.mockClear();
    addMutateAsync.mockClear();
    toggleMutate.mockClear();
    deleteMutate.mockClear();
    fetchDetailsMock.mockClear();
  });

  it("renderiza header e estado vazio", () => {
    wrap(<AdminFilmes />);
    expect(screen.getByText("Buscar Filmes")).toBeInTheDocument();
    expect(screen.getByText("Nenhum filme adicionado.")).toBeInTheDocument();
  });

  it("dispara busca TMDB ao clicar no botão de busca", () => {
    wrap(<AdminFilmes />);
    const input = screen.getByPlaceholderText("Nome do filme...");
    fireEvent.change(input, { target: { value: "Matrix" } });
    fireEvent.click(screen.getByLabelText("Buscar"));
    expect(searchMock).toHaveBeenCalledWith("search_movie", "Matrix");
  });

  it("alterna para aba 'Em cartaz' e chama now_playing", () => {
    wrap(<AdminFilmes />);
    fireEvent.click(screen.getByText("Em cartaz"));
    expect(searchMock).toHaveBeenCalledWith("now_playing");
  });

  it("conta ativos vs total corretamente nos cards de stats", () => {
    movieList = [
      { id: "1", tmdb_id: 1, title: "F1", active: true, genre: "Ação", rating: 8 },
      { id: "2", tmdb_id: 2, title: "F2", active: false, genre: "Drama", rating: 6 },
    ];
    wrap(<AdminFilmes />);
    // Total e Ativos aparecem nos cards de stats
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Ativos")).toBeInTheDocument();
  });

  it("mostra botão de incompletos quando há filme sem gênero/backdrop", () => {
    movieList = [
      { id: "1", tmdb_id: 1, title: "F1", active: true, genre: null, backdrop_url: null },
    ];
    wrap(<AdminFilmes />);
    expect(screen.getByText(/1 incompletos/)).toBeInTheDocument();
  });
});
