import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the hooks
vi.mock("@/hooks/useMovies", () => ({
  useActiveMovies: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { useActiveMovies } from "@/hooks/useMovies";
import { WeeklyMoviesSection } from "../WeeklyMoviesSection";

const mockedUseActiveMovies = vi.mocked(useActiveMovies);

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("WeeklyMoviesSection", () => {
  it("renders loading skeletons when loading", () => {
    mockedUseActiveMovies.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = render(<WeeklyMoviesSection />, { wrapper });
    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("returns null when no movies", () => {
    mockedUseActiveMovies.mockReturnValue({ data: [], isLoading: false } as any);
    const { container } = render(<WeeklyMoviesSection />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("renders movie cards with titles", () => {
    mockedUseActiveMovies.mockReturnValue({
      data: [
        { id: "1", title: "Test Movie", poster_url: null, rating: 8.5, year: 2024, genre: "Action", tmdb_id: 123, overview: null, active: true, created_at: "" },
      ],
      isLoading: false,
    } as any);
    const { getByText } = render(<WeeklyMoviesSection />, { wrapper });
    expect(getByText("Test Movie")).toBeInTheDocument();
    expect(getByText("8.5")).toBeInTheDocument();
    expect(getByText("Sugestões de Filmes (1)")).toBeInTheDocument();
  });
});
