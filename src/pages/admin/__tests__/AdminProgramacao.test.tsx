import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminProgramacao from "../AdminProgramacao";

const mocks = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  updateMutate: vi.fn(),
  updateMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
  storageUpload: vi.fn().mockResolvedValue({ error: null }),
  banners: [] as any[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mocks.storageUpload,
        getPublicUrl: () => ({ data: { publicUrl: "https://x/y.png" } }),
      }),
    },
  },
}));

vi.mock("@/hooks/useBanners", () => ({
  useAllBanners: () => ({ data: mocks.banners, isLoading: false }),
  useCreateBanner: () => ({ mutateAsync: mocks.createMutateAsync }),
  useUpdateBanner: () => ({ mutate: mocks.updateMutate, mutateAsync: mocks.updateMutateAsync }),
  useDeleteBanner: () => ({ mutate: vi.fn(), mutateAsync: mocks.deleteMutateAsync }),
  CATEGORY_LABELS: {
    cover: "📺 Capa",
    football: "⚽ Futebol",
    basketball: "🏀 Basquete",
    ufc: "🥊 UFC/MMA",
    other_sports: "🏆 Demais Esportes",
    football_guide: "📋 Guia do Futebol",
  },
  CATEGORY_LIST: ["cover", "football", "basketball", "ufc", "other_sports", "football_guide"],
}));

vi.mock("@/components/admin/ProgramacaoTexto", () => ({
  ProgramacaoTexto: () => <div>ProgramacaoTexto</div>,
}));
vi.mock("@/components/admin/DailyGamesManager", () => ({
  DailyGamesManager: () => <div>DailyGamesManager</div>,
}));
vi.mock("@/components/admin/ArchivedGamesManager", () => ({
  ArchivedGamesManager: () => <div>ArchivedGamesManager</div>,
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  </MemoryRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.banners = [];
  mocks.createMutateAsync.mockResolvedValue(undefined);
  mocks.updateMutateAsync.mockResolvedValue(undefined);
  mocks.deleteMutateAsync.mockResolvedValue(undefined);
  mocks.storageUpload.mockResolvedValue({ error: null });
});

const switchToCategories = () => fireEvent.click(screen.getByText("🖼️ Banners de imagem"));

describe("AdminProgramacao — sections & categories", () => {
  it("renders section tabs with role tablist", () => {
    render(<AdminProgramacao />, { wrapper });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });

  it("switches to programacao tab", () => {
    render(<AdminProgramacao />, { wrapper });
    fireEvent.click(screen.getByText("📋 Programação"));
    expect(screen.getByText("ProgramacaoTexto")).toBeInTheDocument();
  });

  it("renders all category pills", () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    expect(screen.getAllByText("📺 Capa").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("⚽ Futebol")).toBeInTheDocument();
    expect(screen.getByText("🏀 Basquete")).toBeInTheDocument();
    expect(screen.getByText("🥊 UFC/MMA")).toBeInTheDocument();
  });

  it("shows empty state with helper text", () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    expect(screen.getByText("Nenhum banner nesta categoria")).toBeInTheDocument();
    expect(screen.getByText(/Cole, arraste ou clique/i)).toBeInTheDocument();
  });
});

describe("AdminProgramacao — multi-upload", () => {
  it("input file accepts multiple", () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    const input = screen.getByLabelText("Selecionar imagens para upload") as HTMLInputElement;
    expect(input.multiple).toBe(true);
  });

  it("uploads multiple files sequentially and increments sort_order", async () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    const input = screen.getByLabelText("Selecionar imagens para upload") as HTMLInputElement;
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
      new File(["c"], "c.png", { type: "image/png" }),
    ];
    Object.defineProperty(input, "files", { value: files });
    fireEvent.change(input);
    await new Promise((r) => setTimeout(r, 50));
    expect(mocks.storageUpload).toHaveBeenCalledTimes(3);
    expect(mocks.createMutateAsync).toHaveBeenCalledTimes(3);
    const calls = mocks.createMutateAsync.mock.calls.map((c) => c[0].sort_order);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("rejects file larger than 5MB and reports it", async () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    const input = screen.getByLabelText("Selecionar imagens para upload") as HTMLInputElement;
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [big] });
    fireEvent.change(input);
    await new Promise((r) => setTimeout(r, 30));
    expect(toastMock.error).toHaveBeenCalled();
    expect(mocks.createMutateAsync).not.toHaveBeenCalled();
  });

  it("ignores non-image files silently in selection", async () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    const input = screen.getByLabelText("Selecionar imagens para upload") as HTMLInputElement;
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["doc"], "doc.pdf", { type: "application/pdf" }),
    ];
    Object.defineProperty(input, "files", { value: files });
    fireEvent.change(input);
    await new Promise((r) => setTimeout(r, 30));
    expect(mocks.createMutateAsync).toHaveBeenCalledTimes(1);
  });
});

describe("AdminProgramacao — schedule validation", () => {
  it("shows alert and blocks upload when custom schedule is in the past", async () => {
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    fireEvent.click(screen.getByText("Personalizado"));
    const dt = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}T/i) as HTMLInputElement;
    fireEvent.change(dt, { target: { value: "2020-01-01T00:00" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/data e hora futuras/i);

    const input = screen.getByLabelText("Selecionar imagens para upload") as HTMLInputElement;
    const file = new File(["a"], "a.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);
    await new Promise((r) => setTimeout(r, 30));
    expect(mocks.createMutateAsync).not.toHaveBeenCalled();
  });
});

describe("AdminProgramacao — delete confirmation", () => {
  it("opens AlertDialog and cancels without deleting", async () => {
    mocks.banners = [{
      id: "b1", image_url: "u", title: null, category: "cover", active: true,
      sort_order: 1, expires_at: null, publish_at: null, created_at: new Date().toISOString(),
    }];
    render(<AdminProgramacao />, { wrapper });
    switchToCategories();
    fireEvent.click(screen.getByLabelText("Remover banner"));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Remover banner\?/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText("Cancelar"));
    expect(mocks.deleteMutateAsync).not.toHaveBeenCalled();
  });
});
