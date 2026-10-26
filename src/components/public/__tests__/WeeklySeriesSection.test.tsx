import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useSeries", () => ({
  useActiveSeries: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { useActiveSeries } from "@/hooks/useSeries";
import { WeeklySeriesSection } from "../WeeklySeriesSection";

const mockedUseActiveSeries = vi.mocked(useActiveSeries);

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("WeeklySeriesSection", () => {
  it("renders loading skeletons when loading", () => {
    mockedUseActiveSeries.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = render(<WeeklySeriesSection />, { wrapper });
    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("returns null when no series", () => {
    mockedUseActiveSeries.mockReturnValue({ data: [], isLoading: false } as any);
    const { container } = render(<WeeklySeriesSection />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("renders series cards with titles", () => {
    mockedUseActiveSeries.mockReturnValue({
      data: [
        { id: "1", title: "Test Series", poster_url: null, rating: 9.0, year: 2023, genre: "Drama", tmdb_id: 456, overview: null, active: true, created_at: "" },
      ],
      isLoading: false,
    } as any);
    const { getByText } = render(<WeeklySeriesSection />, { wrapper });
    expect(getByText("Test Series")).toBeInTheDocument();
    expect(getByText("9.0")).toBeInTheDocument();
    expect(getByText("Sugestões de Séries (1)")).toBeInTheDocument();
  });
});
