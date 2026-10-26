import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { useState } from "react";
import { ContentDetailSheet } from "../ContentDetailSheet";
import { TrailerModal } from "../TrailerModal";

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: () => ({ trailerKey: null, loading: false }),
}));

const item = {
  title: "Como Mágica",
  overview: "x",
  poster_url: "p.jpg",
  backdrop_url: "b.jpg",
  rating: 8,
  year: 2026,
  genre: "Animação",
  tmdb_id: 1,
  content_type: "movie",
};

const Trigger = ({ kind }: { kind: "sheet" | "trailer" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {kind === "sheet" ? (
        <ContentDetailSheet open={open} onClose={() => setOpen(false)} item={item} />
      ) : (
        <TrailerModal open={open} onClose={() => setOpen(false)} trailerKey="abc" />
      )}
    </>
  );
};

describe("Focus management — overlays", () => {
  afterEach(() => cleanup());

  it("ContentDetailSheet move foco para dentro ao abrir e restaura ao fechar", async () => {
    const { getByText } = render(<Trigger kind="sheet" />);
    const trigger = getByText("Abrir") as HTMLButtonElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    // foco saiu do trigger e foi para algum elemento dentro do dialog (botão Fechar)
    expect(document.activeElement).not.toBe(trigger);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Fechar");

    // Fecha via ESC
    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("TrailerModal restaura foco ao fechar", async () => {
    const { getByText } = render(<Trigger kind="trailer" />);
    const trigger = getByText("Abrir") as HTMLButtonElement;
    trigger.focus();

    fireEvent.click(trigger);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Fechar trailer");

    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("Tab cicla foco dentro do TrailerModal (não escapa para o body)", async () => {
    const { getByText } = render(<Trigger kind="trailer" />);
    const trigger = getByText("Abrir") as HTMLButtonElement;
    trigger.focus();
    fireEvent.click(trigger);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });

    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    const closeBtn = document.body.querySelector('[aria-label="Fechar trailer"]') as HTMLElement;
    const iframe = document.body.querySelector("iframe") as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(closeBtn).toBeTruthy();
    expect(iframe).toBeTruthy();

    // Shift+Tab a partir do primeiro focável volta para o último (iframe), nunca para o trigger fora
    closeBtn.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(trigger);
  });
});
