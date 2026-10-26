import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ContentDetailSheet } from "../ContentDetailSheet";

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: () => ({ trailerKey: null, loading: false }),
}));

const baseItem = {
  title: "Como Mágica",
  overview: "Uma aventura encantadora.",
  poster_url: "https://example.com/p.jpg",
  backdrop_url: "https://example.com/b.jpg",
  rating: 8.1,
  year: 2026,
  genre: "Animação",
  tmdb_id: 123,
  content_type: "movie",
};

describe("ContentDetailSheet", () => {
  afterEach(() => cleanup());

  it("não renderiza quando open=false", () => {
    render(<ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza no document.body via portal com z-index alto", () => {
    render(<ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // garante que está fora da árvore react do componente pai (renderizado direto no body)
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.className).toMatch(/z-\[100\]/);
  });

  it("mostra título do item", () => {
    render(<ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />);
    expect(screen.getByText("Como Mágica")).toBeInTheDocument();
  });

  it("dispara onClose ao clicar no botão fechar", () => {
    const onClose = vi.fn();
    render(<ContentDetailSheet open={true} onClose={onClose} item={baseItem} />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(onClose).toHaveBeenCalled();
  });

  it("fecha ao pressionar ESC", () => {
    const onClose = vi.fn();
    render(<ContentDetailSheet open={true} onClose={onClose} item={baseItem} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("trava scroll do body enquanto aberto e restaura ao fechar", () => {
    const { rerender } = render(
      <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
