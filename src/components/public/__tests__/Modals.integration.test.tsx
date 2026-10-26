import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { ContentDetailSheet } from "../ContentDetailSheet";
import { TrailerModal } from "../TrailerModal";
import { BottomNav } from "../BottomNav";

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: () => ({ trailerKey: null, loading: false }),
}));

const item = {
  title: "Como Mágica",
  overview: "Aventura.",
  poster_url: "https://example.com/p.jpg",
  backdrop_url: "https://example.com/b.jpg",
  rating: 8.1,
  year: 2026,
  genre: "Animação",
  tmdb_id: 123,
  content_type: "movie",
};

const renderWithNav = (kind: "sheet" | "trailer", onClose: () => void) =>
  render(
    <div>
      <BottomNav activeTab="novidades" onTabChange={() => {}} />
      {kind === "sheet" ? (
        <ContentDetailSheet open onClose={onClose} item={item} />
      ) : (
        <TrailerModal open onClose={onClose} trailerKey="abc" title="X" />
      )}
    </div>
  );

const zIndexOf = (el: Element | null) => {
  if (!el) return -1;
  const m = (el.className as string).match(/z-\[(\d+)\]/);
  return m ? Number(m[1]) : 0;
};

describe("Modais — integração com BottomNav", () => {
  afterEach(() => cleanup());

  describe("ContentDetailSheet", () => {
    it("renderiza via portal direto em document.body (fora do container do componente)", () => {
      const { container } = renderWithNav("sheet", () => {});
      const dialog = screen.getByRole("dialog");
      expect(document.body.contains(dialog)).toBe(true);
      expect(container.contains(dialog)).toBe(false);
    });

    it("usa z-index maior que o BottomNav (z-50)", () => {
      const { container } = renderWithNav("sheet", () => {});
      const nav = container.querySelector("nav")!;
      const dialog = screen.getByRole("dialog");
      expect(zIndexOf(dialog)).toBeGreaterThan(zIndexOf(nav));
      expect(zIndexOf(dialog)).toBeGreaterThanOrEqual(60);
    });

    it("dispara onClose ao pressionar ESC", () => {
      const onClose = vi.fn();
      renderWithNav("sheet", onClose);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose ao clicar no backdrop", () => {
      const onClose = vi.fn();
      renderWithNav("sheet", onClose);
      const backdrop = document.body.querySelector(".fixed.inset-0.bg-black\\/60") as HTMLElement;
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose ao clicar no botão X", () => {
      const onClose = vi.fn();
      renderWithNav("sheet", onClose);
      fireEvent.click(screen.getByLabelText("Fechar"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("TrailerModal", () => {
    it("renderiza via portal em document.body", () => {
      const { container } = renderWithNav("trailer", () => {});
      const dialog = screen.getByRole("dialog");
      expect(document.body.contains(dialog)).toBe(true);
      expect(container.contains(dialog)).toBe(false);
    });

    it("z-index acima do BottomNav", () => {
      const { container } = renderWithNav("trailer", () => {});
      const nav = container.querySelector("nav")!;
      const dialog = screen.getByRole("dialog");
      expect(zIndexOf(dialog)).toBeGreaterThan(zIndexOf(nav));
      expect(zIndexOf(dialog)).toBeGreaterThanOrEqual(70);
    });

    it("dispara onClose com ESC", () => {
      const onClose = vi.fn();
      renderWithNav("trailer", onClose);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose ao clicar no backdrop", () => {
      const onClose = vi.fn();
      renderWithNav("trailer", onClose);
      const backdrop = document.body.querySelector(".fixed.inset-0.bg-black\\/85") as HTMLElement;
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose pelo botão Fechar trailer", () => {
      const onClose = vi.fn();
      renderWithNav("trailer", onClose);
      fireEvent.click(screen.getByLabelText("Fechar trailer"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("BottomNav coexiste com modal sem ser desmontada (portal isolado)", () => {
    const { container } = renderWithNav("sheet", () => {});
    const nav = container.querySelector("nav")!;
    const dialog = screen.getByRole("dialog");
    expect(nav).toBeTruthy();
    expect(within(nav).queryByRole("dialog")).toBeNull();
    expect(nav.contains(dialog)).toBe(false);
  });
});
