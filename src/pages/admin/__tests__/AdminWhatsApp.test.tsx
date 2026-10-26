import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useDailyGames", () => ({
  useAllDailyGames: () => ({ data: [], dataUpdatedAt: Date.now() }),
}));

vi.mock("@/hooks/useSiteUrl", () => ({
  useSiteUrl: () => "https://example.com",
}));

vi.mock("@/hooks/useShareLandingCounts", () => ({
  useShareLandingCounts: () => ({ counts: {} }),
}));

import AdminWhatsApp from "../AdminWhatsApp";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("AdminWhatsApp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders header and link section", () => {
    render(<AdminWhatsApp />, { wrapper });
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByText("WhatsApp — Compartilhamento")).toBeInTheDocument();
    expect(screen.getByText("Link do Site")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("renders pre-built templates", () => {
    render(<AdminWhatsApp />, { wrapper });
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByText("📺 Geral do Dia")).toBeInTheDocument();
    expect(screen.getByText("⚽ Jogos")).toBeInTheDocument();
    expect(screen.getByText("🍿 Entretenimento")).toBeInTheDocument();
    expect(screen.getByText("🔴 Ao Vivo")).toBeInTheDocument();
  });

  it("renders custom message section with link tab toggle", () => {
    render(<AdminWhatsApp />, { wrapper });
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByText("Mensagem Personalizada")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Digite sua mensagem/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link: Programação" })).toBeInTheDocument();
  });

  it("renders day chips: Hoje, Amanhã, +2 dias", () => {
    render(<AdminWhatsApp />, { wrapper });
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amanhã" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+2 dias" })).toBeInTheDocument();
  });

  it("switches selected day when chip clicked", () => {
    render(<AdminWhatsApp />, { wrapper });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByRole("button", { name: "Amanhã" }));
    const dateInput = screen.getByLabelText("Escolher data") as HTMLInputElement;
    expect(dateInput.value).not.toBe("");
  });
});
