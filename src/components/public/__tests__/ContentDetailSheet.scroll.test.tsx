import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ContentDetailSheet } from "../ContentDetailSheet";

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: () => ({ trailerKey: null, loading: false }),
}));

const item = {
  title: "Como Mágica",
  overview: "Uma aventura emocionante com muitos detalhes para rolar a tela.",
  poster_url: "https://example.com/p.jpg",
  backdrop_url: "https://example.com/b.jpg",
  rating: 8.1,
  year: 2026,
  genre: "Animação",
  tmdb_id: 123,
  content_type: "movie",
};

describe("ContentDetailSheet — scroll interno e body-scroll lock", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("trava o scroll do <body> ao abrir e restaura ao fechar", () => {
    document.body.style.overflow = "auto";
    const onClose = vi.fn();

    const { rerender } = render(
      <ContentDetailSheet open onClose={onClose} item={item} />
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<ContentDetailSheet open={false} onClose={onClose} item={item} />);
    expect(document.body.style.overflow).toBe("auto");
  });

  it("restaura o overflow original mesmo se for desmontado enquanto aberto", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = render(
      <ContentDetailSheet open onClose={() => {}} item={item} />
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("contém um container scrollável interno (overflow-y-auto + overscroll-contain)", () => {
    render(<ContentDetailSheet open onClose={() => {}} item={item} />);
    const dialog = screen.getByRole("dialog");
    const scroller = dialog.querySelector(".overflow-y-auto");
    expect(scroller).not.toBeNull();
    expect(scroller!.className).toMatch(/overscroll-contain/);
  });

  it("o handle de drag tem touch-action:none — somente ele captura o drag-to-dismiss", () => {
    render(<ContentDetailSheet open onClose={() => {}} item={item} />);
    const dialog = screen.getByRole("dialog");
    // Encontra o handle pelo seu marcador visual (a barrinha w-10 h-1).
    const bar = dialog.querySelector("div.w-10.h-1");
    expect(bar).not.toBeNull();
    const handle = bar!.parentElement as HTMLElement;
    expect(handle.style.touchAction).toBe("none");
  });

  it("scroll dentro do conteúdo NÃO dispara onClose (não arrasta o overlay)", () => {
    const onClose = vi.fn();
    render(<ContentDetailSheet open onClose={onClose} item={item} />);
    const dialog = screen.getByRole("dialog");
    const scroller = dialog.querySelector(".overflow-y-auto") as HTMLElement;

    // Simula um scroll/wheel + touchmove dentro do conteúdo.
    fireEvent.scroll(scroller, { target: { scrollTop: 200 } });
    fireEvent.wheel(scroller, { deltaY: 200 });
    fireEvent.touchStart(scroller, { touches: [{ clientX: 100, clientY: 400 }] });
    fireEvent.touchMove(scroller, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(scroller, { changedTouches: [{ clientX: 100, clientY: 200 }] });

    expect(onClose).not.toHaveBeenCalled();
  });
});
