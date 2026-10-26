import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { useState } from "react";
import { ContentDetailSheet } from "../ContentDetailSheet";
import { TrailerModal } from "../TrailerModal";

vi.mock("@/hooks/useTrailerKey", () => ({
  useTrailerKey: () => ({ trailerKey: null, loading: false }),
}));

const item = {
  title: "Acessível",
  overview: "x",
  poster_url: "p.jpg",
  backdrop_url: "b.jpg",
  rating: 8,
  year: 2026,
  genre: "Drama",
  tmdb_id: 1,
  content_type: "movie",
};

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });

const SheetTrigger = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Detalhes</button>
      <ContentDetailSheet open={open} onClose={() => setOpen(false)} item={item} />
    </>
  );
};

const TrailerTrigger = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Trailer</button>
      <TrailerModal open={open} onClose={() => setOpen(false)} trailerKey="abc" />
    </>
  );
};

afterEach(() => cleanup());

describe("Acessibilidade — foco e ARIA nos modais", () => {
  describe("ContentDetailSheet", () => {
    it("expõe role=dialog e aria-modal=true", async () => {
      const { getByText } = render(<SheetTrigger />);
      fireEvent.click(getByText("Detalhes"));
      await flush();
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute("aria-modal")).toBe("true");
    });

    it("foco vai para o modal ao abrir (não permanece no trigger)", async () => {
      const { getByText } = render(<SheetTrigger />);
      const trigger = getByText("Detalhes") as HTMLButtonElement;
      trigger.focus();
      fireEvent.click(trigger);
      await flush();
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it("retorna foco ao trigger ao fechar pelo botão X", async () => {
      const { getByText } = render(<SheetTrigger />);
      const trigger = getByText("Detalhes") as HTMLButtonElement;
      trigger.focus();
      fireEvent.click(trigger);
      await flush();
      const closeBtn = document.body.querySelector('[aria-label="Fechar"]') as HTMLElement;
      fireEvent.click(closeBtn);
      await flush();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe("TrailerModal", () => {
    it("expõe role=dialog e aria-modal=true", async () => {
      const { getByText } = render(<TrailerTrigger />);
      fireEvent.click(getByText("Trailer"));
      await flush();
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute("aria-modal")).toBe("true");
    });

    it("foco inicial cai no botão Fechar trailer", async () => {
      const { getByText } = render(<TrailerTrigger />);
      const trigger = getByText("Trailer") as HTMLButtonElement;
      trigger.focus();
      fireEvent.click(trigger);
      await flush();
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Fechar trailer");
    });

    it("Tab forward mantém o foco dentro do dialog (não vaza para o trigger)", async () => {
      const { getByText } = render(<TrailerTrigger />);
      const trigger = getByText("Trailer") as HTMLButtonElement;
      trigger.focus();
      fireEvent.click(trigger);
      await flush();

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const iframe = document.body.querySelector("iframe") as HTMLElement;
      iframe.focus();
      fireEvent.keyDown(document, { key: "Tab" });
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(trigger);
    });

    it("retorna foco ao trigger ao fechar pelo botão", async () => {
      const { getByText } = render(<TrailerTrigger />);
      const trigger = getByText("Trailer") as HTMLButtonElement;
      trigger.focus();
      fireEvent.click(trigger);
      await flush();
      const closeBtn = document.body.querySelector('[aria-label="Fechar trailer"]') as HTMLElement;
      fireEvent.click(closeBtn);
      await flush();
      expect(document.activeElement).toBe(trigger);
    });

    it("retorna foco ao trigger ao fechar pelo backdrop", async () => {
      const { getByText } = render(<TrailerTrigger />);
      const trigger = getByText("Trailer") as HTMLButtonElement;
      trigger.focus();
      fireEvent.click(trigger);
      await flush();
      // Backdrop é o primeiro overlay fixed inset-0 com bg-black/85
      const backdrop = document.body.querySelector(
        ".fixed.inset-0.bg-black\\/85",
      ) as HTMLElement;
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      await flush();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
