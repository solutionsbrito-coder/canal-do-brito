import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminCanaisLogos from "../AdminCanaisLogos";

const mocks = vi.hoisted(() => ({
  rows: [] as any[],
  discovered: {
    isLoading: false,
    refetch: vi.fn(),
    all: [] as any[],
    orphans: [] as any[],
    mapped: [] as any[],
    builtin: [] as any[],
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: mocks.rows, error: null }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock("@/hooks/useDiscoveredChannels", () => ({
  useDiscoveredChannels: () => mocks.discovered,
}));

vi.mock("@/hooks/useChannelMappings", () => ({
  useChannelMappings: () => ({ data: new Map() }),
  CHANNEL_MAPPINGS_QK: ["channel_logo_mappings"] as const,
  CHANNEL_ALIASES_QK: ["channel_aliases"] as const,
}));

vi.mock("@/components/admin/ChannelPreviewStage", () => ({
  ChannelPreviewStage: () => <div data-testid="preview-stage" />,
}));

vi.mock("@/components/admin/ChannelLogoUpload", () => ({
  ChannelLogoUpload: () => <div data-testid="upload" />,
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminCanaisLogos />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("AdminCanaisLogos", () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.discovered.all = [];
    mocks.discovered.orphans = [];
  });

  it("renders header and stat cards", async () => {
    renderPage();
    expect(screen.getByText("Canais & Logos")).toBeInTheDocument();
    expect(screen.getByText("Detectados (90d)")).toBeInTheDocument();
    expect(screen.getAllByText("Sem logo").length).toBeGreaterThan(0);
  });

  it("opens new mapping modal when clicking Novo", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Novo/i }));
    await waitFor(() => expect(screen.getByText("Novo mapeamento")).toBeInTheDocument());
    expect(screen.getByLabelText(/Nome do canal/i)).toBeInTheDocument();
  });

  it("shows orphan empty-state when there are no orphans", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Todos os canais detectados já têm logo/i)).toBeInTheDocument()
    );
  });

  it("shows bulk silence button when there are orphans", async () => {
    mocks.discovered.orphans = [
      { name: "Foo TV", normalized: "foo-tv", count: 1, isBuiltin: false, isOrphan: true },
      { name: "Bar TV", normalized: "bar-tv", count: 2, isBuiltin: false, isOrphan: true },
    ];
    mocks.discovered.all = mocks.discovered.orphans;
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Silenciar 2/i })).toBeInTheDocument()
    );
  });
});
