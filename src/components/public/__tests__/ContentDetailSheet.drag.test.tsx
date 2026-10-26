import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { ContentDetailSheet } from "../ContentDetailSheet";

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: () => ({ trailerKey: null, loading: false }),
}));

const item = {
  title: "Drag Test",
  overview: "x",
  poster_url: "p.jpg",
  backdrop_url: null,
  rating: 7,
  year: 2026,
  genre: "Drama",
  tmdb_id: 1,
  content_type: "movie",
};

const fireDragEnd = (handle: HTMLElement, info: { offsetY: number; velocityY: number }) => {
  // Framer-motion no JSDOM expõe drag end como pointerup; emulamos chamando
  // diretamente o handler via evento sintético com as métricas-alvo. Como não
  // temos acesso direto, validamos via cenários equivalentes:
  // 1) pointerdown no handle inicia drag
  // 2) pointermove acumula offset
  // 3) pointerup dispara handleDragEnd
  fireEvent.pointerDown(handle, { clientX: 200, clientY: 400, pointerId: 1 });
  fireEvent.pointerMove(window, {
    clientX: 200,
    clientY: 400 + info.offsetY,
    pointerId: 1,
  });
  fireEvent.pointerUp(window, {
    clientX: 200,
    clientY: 400 + info.offsetY,
    pointerId: 1,
  });
};

describe("ContentDetailSheet — drag thresholds (unit)", () => {
  afterEach(() => cleanup());

  it("offset < 120px NÃO chama onClose (snap)", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ContentDetailSheet open={true} onClose={onClose} item={item} />,
    );
    const handle = container.ownerDocument.body.querySelector(
      "div.cursor-grab",
    ) as HTMLElement;
    expect(handle).toBeTruthy();
    await act(async () => {
      fireDragEnd(handle, { offsetY: 50, velocityY: 0 });
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renderiza dragHandle com touchAction:none (não rola página durante drag)", () => {
    render(<ContentDetailSheet open={true} onClose={() => {}} item={item} />);
    const handle = document.body.querySelector("div.cursor-grab") as HTMLElement;
    expect(handle.style.touchAction).toBe("none");
  });

  it("área de scroll usa overscroll-contain (não arrasta sheet inteiro)", () => {
    render(<ContentDetailSheet open={true} onClose={() => {}} item={item} />);
    const scrollArea = document.body.querySelector(".overflow-y-auto") as HTMLElement;
    expect(scrollArea).toBeTruthy();
    expect(scrollArea.className).toMatch(/overscroll-contain/);
  });

  it("sheet tem max-h-[90vh] para não exceder viewport", () => {
    render(<ContentDetailSheet open={true} onClose={() => {}} item={item} />);
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toMatch(/max-h-\[90vh\]/);
  });
});

import { afterEach } from "vitest";
