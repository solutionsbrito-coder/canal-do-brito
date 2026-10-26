import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../AdminDashboard";

// Mutable refs to control mocked hook returns per test
const refetchBanners = vi.fn();
const refetchMovies = vi.fn();
const refetchSeries = vi.fn();
const refetchNews = vi.fn();
const refetchGames = vi.fn();

const state = {
  errorAll: false,
  loadingAll: false,
};

const mkResult = (data: any) => ({
  data: state.loadingAll ? undefined : data,
  isLoading: state.loadingAll,
  isFetching: state.loadingAll,
  isError: state.errorAll,
  refetch: vi.fn(),
  dataUpdatedAt: Date.now(),
});

vi.mock("@/hooks/useBanners", () => ({
  useAllBanners: () => ({
    ...mkResult([
      { active: true, title: "Banner 1", image_url: "https://example.com/a.jpg", created_at: new Date().toISOString() },
      { active: false, title: "Banner 2", image_url: "https://example.com/b.jpg", created_at: new Date().toISOString() },
    ]),
    refetch: refetchBanners,
  }),
}));
vi.mock("@/hooks/useMovies", () => ({
  useAllMovies: () => ({
    ...mkResult([{ active: true, genre: "Action", title: "Movie 1", created_at: new Date().toISOString() }]),
    refetch: refetchMovies,
  }),
}));
vi.mock("@/hooks/useSeries", () => ({
  useAllSeries: () => ({
    ...mkResult([{ active: true, genre: null, title: "Series 1", created_at: new Date().toISOString() }]),
    refetch: refetchSeries,
  }),
}));
vi.mock("@/hooks/useNewsReleases", () => ({
  useAllNewsReleases: () => ({
    ...mkResult([{ active: true, genres: "Drama", title: "News 1", created_at: new Date().toISOString() }]),
    refetch: refetchNews,
  }),
}));
vi.mock("@/hooks/useDailyGames", () => ({
  useAllDailyGames: () => ({
    ...mkResult([{ active: true }]),
    refetch: refetchGames,
  }),
}));
vi.mock("@/components/admin/UpcomingActivations", () => ({
  UpcomingActivations: () => <div data-testid="upcoming" />,
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  state.errorAll = false;
  state.loadingAll = false;
  navigateMock.mockClear();
  refetchBanners.mockClear();
  refetchMovies.mockClear();
  refetchSeries.mockClear();
  refetchNews.mockClear();
  refetchGames.mockClear();
});

describe("AdminDashboard", () => {
  it("renders stat card labels", () => {
    wrap(<AdminDashboard />);
    expect(screen.getAllByText("Banners").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Filmes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Séries").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Novidades").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Jogos Hoje")).toBeInTheDocument();
  });

  it("renders greeting", () => {
    wrap(<AdminDashboard />);
    const greeting = screen.getByText(/^(Bom dia|Boa tarde|Boa noite) 👋$/);
    expect(greeting).toBeInTheDocument();
  });

  it("renders quick actions including WhatsApp and Configurações", () => {
    wrap(<AdminDashboard />);
    expect(screen.getByText("Enviar no WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Publicar programação")).toBeInTheDocument();
    expect(screen.getByText("+ Configurações")).toBeInTheDocument();
  });

  it("shows content health checklist when items are incomplete", () => {
    wrap(<AdminDashboard />);
    expect(screen.getByText("Central de pendências")).toBeInTheDocument();
    expect(screen.getByText(/conteúdos? incompletos?/)).toBeInTheDocument();
  });

  it("renders UpcomingActivations", () => {
    wrap(<AdminDashboard />);
    expect(screen.getByTestId("upcoming")).toBeInTheDocument();
  });

  it("navigates to /admin/banners when Banners stat card is clicked", () => {
    wrap(<AdminDashboard />);
    const card = screen.getByLabelText(/^Banners: \d+ total/);
    fireEvent.click(card);
    expect(navigateMock).toHaveBeenCalledWith("/admin/programacao?tab=categories");
  });

  it("triggers all refetch when refresh button is clicked", () => {
    wrap(<AdminDashboard />);
    fireEvent.click(screen.getByTestId("dashboard-refresh"));
    expect(refetchBanners).toHaveBeenCalled();
    expect(refetchMovies).toHaveBeenCalled();
    expect(refetchSeries).toHaveBeenCalled();
    expect(refetchNews).toHaveBeenCalled();
    expect(refetchGames).toHaveBeenCalled();
  });

  it("renders error alert when a hook fails", () => {
    state.errorAll = true;
    wrap(<AdminDashboard />);
    expect(screen.getByText(/Erro ao carregar alguns dados/)).toBeInTheDocument();
    expect(screen.getByText(/Tentar novamente/)).toBeInTheDocument();
  });
});
