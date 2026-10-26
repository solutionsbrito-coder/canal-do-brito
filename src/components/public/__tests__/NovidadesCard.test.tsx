import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NovidadesCard } from "../NovidadesCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock hooks
const mockItems = [
  {
    id: "1",
    title: "Filme Teste",
    content_type: "movie",
    badge_type: "lancamento",
    image_url: "https://example.com/poster1.jpg",
    overview: "Uma sinopse de teste",
    year: 2026,
    rating: 8.5,
    tmdb_id: 101,
    active: true,
    display_order: 1,
    added_by: null,
    created_at: "2026-01-01",
    genres: "Ação, Drama",
    runtime: 120,
    seasons: null,
    tagline: null,
  },
  {
    id: "2",
    title: "Série Teste",
    content_type: "series",
    badge_type: "nova_temporada",
    image_url: "https://example.com/poster2.jpg",
    overview: "Outra sinopse",
    year: 2025,
    rating: 7.0,
    tmdb_id: 202,
    active: true,
    display_order: 2,
    added_by: null,
    created_at: "2026-01-01",
    genres: "Comédia",
    runtime: null,
    seasons: 3,
    tagline: null,
  },
];

vi.mock("@/hooks/useNewsReleases", () => ({
  useActiveNewsReleases: vi.fn(),
}));

vi.mock("@/hooks/useTrailerAvailability", () => ({
  useTrailerAvailability: vi.fn(() => ({ available: new Map(), loading: false })),
}));

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: vi.fn(() => ({ trailerKey: null, loading: false })),
}));

import { useActiveNewsReleases } from "@/hooks/useNewsReleases";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("NovidadesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when loading", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(<NovidadesCard />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("returns null when no items", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { container } = render(<NovidadesCard />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("renders title and badge for single item", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: [mockItems[0]],
      isLoading: false,
    } as any);

    render(<NovidadesCard />, { wrapper });
    expect(screen.getAllByText("FILME TESTE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🆕 Lançamento").length).toBeGreaterThan(0);
  });

  it("renders navigation arrows with multiple items", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: mockItems,
      isLoading: false,
    } as any);

    render(<NovidadesCard />, { wrapper });
    expect(screen.getByLabelText("Anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("does not render arrows with single item", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: [mockItems[0]],
      isLoading: false,
    } as any);

    render(<NovidadesCard />, { wrapper });
    expect(screen.queryByLabelText("Anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Próximo")).not.toBeInTheDocument();
  });

  it("navigates to next slide on arrow click", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: mockItems,
      isLoading: false,
    } as any);

    render(<NovidadesCard />, { wrapper });
    expect(screen.getByText("1/2")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Próximo"));
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("renders correct badge for each type", () => {
    const types = [
      { badge_type: "lancamento", expected: "🆕 Lançamento" },
      { badge_type: "nova_temporada", expected: "📺 Nova Temporada" },
      { badge_type: "estreia", expected: "⭐ Estreia" },
      { badge_type: "exclusivo", expected: "👑 Exclusivo" },
      { badge_type: "unknown", expected: "🔥 Novidade" },
    ];

    for (const { badge_type, expected } of types) {
      vi.mocked(useActiveNewsReleases).mockReturnValue({
        data: [{ ...mockItems[0], badge_type }],
        isLoading: false,
      } as any);

      const { unmount } = render(<NovidadesCard />, { wrapper });
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renders metadata row with type, year and genres", () => {
    vi.mocked(useActiveNewsReleases).mockReturnValue({
      data: [mockItems[0]],
      isLoading: false,
    } as any);

    render(<NovidadesCard />, { wrapper });
    // Mobile + desktop both render metadata
    const metaElements = screen.getAllByText(/🎬 Filme · 2026 · Ação, Drama/);
    expect(metaElements.length).toBeGreaterThan(0);
  });
});
