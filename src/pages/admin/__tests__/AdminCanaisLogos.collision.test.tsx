import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminCanaisLogos from "../AdminCanaisLogos";

// Hoisted state shared with the supabase mock
const state = vi.hoisted(() => ({
  // What the pre-check (.select('id, name').eq('name_normalized', X).maybeSingle()) returns
  clashRow: null as null | { id: string; name: string },
  // Whether a real update/upsert was called (we want to ensure it is NOT)
  writeCalled: false,
}));

vi.mock("@/integrations/supabase/client", () => {
  const makeQuery = (table: string) => {
    const q: any = {
      _table: table,
      _filters: {} as Record<string, any>,
      select: vi.fn(() => q),
      eq: vi.fn((col: string, val: any) => {
        q._filters[col] = val;
        return q;
      }),
      order: vi.fn(() => q),
      maybeSingle: vi.fn(async () => {
        if (table === "channel_logo_mappings" && q._filters.name_normalized) {
          return { data: state.clashRow, error: null };
        }
        return { data: null, error: null };
      }),
      // initial admin list fetch awaits the chain itself
      then: (resolve: any) => resolve({ data: [], error: null }),
      update: vi.fn(() => {
        state.writeCalled = true;
        return { eq: vi.fn(async () => ({ error: null })) };
      }),
      upsert: vi.fn(async () => {
        state.writeCalled = true;
        return { error: null };
      }),
      insert: vi.fn(async () => ({ error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    return q;
  };
  return {
    supabase: {
      from: vi.fn((table: string) => makeQuery(table)),
      rpc: vi.fn(async () => ({ error: null })),
    },
  };
});

vi.mock("@/hooks/useDiscoveredChannels", () => ({
  useDiscoveredChannels: () => ({
    isLoading: false,
    refetch: vi.fn(),
    all: [],
    orphans: [],
    mapped: [],
    builtin: [],
  }),
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

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
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

describe("AdminCanaisLogos – colisão de name_normalized", () => {
  beforeEach(() => {
    state.clashRow = null;
    state.writeCalled = false;
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("exibe mensagem clara quando há colisão de name_normalized (evita erro genérico 23505)", async () => {
    // Simula que já existe um mapping "Globo HD" cujo name_normalized = 'globo'
    state.clashRow = { id: "existing-id", name: "Globo HD" };

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Novo/i }));
    await waitFor(() => expect(screen.getByText("Novo mapeamento")).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/Nome do canal/i);
    fireEvent.change(nameInput, { target: { value: "Globo" } });

    fireEvent.click(screen.getByRole("button", { name: /^Salvar/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());

    const msg = String(toastMock.error.mock.calls[0][0]);
    expect(msg).toMatch(/já existe um mapeamento/i);
    expect(msg).toContain("Globo HD");

    // Garante que NÃO chegou a chamar update/upsert (curto-circuito antes do 23505)
    expect(state.writeCalled).toBe(false);
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});
