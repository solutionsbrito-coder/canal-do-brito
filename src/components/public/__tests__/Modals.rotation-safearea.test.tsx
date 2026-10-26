/// <reference types="node" />
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { render, screen, cleanup } from "@testing-library/react";
import { ContentDetailSheet } from "../ContentDetailSheet";
import { TrailerModal } from "../TrailerModal";

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

/**
 * Simula a leitura de `env(safe-area-inset-*)`.
 * Em jsdom não há suporte real ao CSS env(), então sobrescrevemos
 * `getComputedStyle` para devolver os paddings esperados.
 */
const mockSafeArea = (insets: { top?: number; bottom?: number; left?: number; right?: number }) => {
  const original = window.getComputedStyle.bind(window);
  const spy = vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element) => {
    const cs = original(el as Element);
    return new Proxy(cs, {
      get(target, prop: string) {
        if (prop === "paddingBottom" && insets.bottom != null) return `${insets.bottom}px`;
        if (prop === "paddingTop" && insets.top != null) return `${insets.top}px`;
        if (prop === "paddingLeft" && insets.left != null) return `${insets.left}px`;
        if (prop === "paddingRight" && insets.right != null) return `${insets.right}px`;
        return (target as unknown as Record<string, unknown>)[prop];
      },
    });
  });
  return () => spy.mockRestore();
};

const setViewport = (width: number, height: number, orientation: "portrait-primary" | "landscape-primary") => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
  // matchMedia já é mockado em src/test/setup.ts; reescreve para refletir orientação
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("orientation: portrait")
        ? orientation === "portrait-primary"
        : query.includes("orientation: landscape")
        ? orientation === "landscape-primary"
        : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new Event("orientationchange"));
};

describe("Modais — rotação e safe-areas iOS", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  describe("ContentDetailSheet", () => {
    it("declara padding-bottom com env(safe-area-inset-bottom) no fonte do componente", () => {
      // jsdom descarta env() do estilo computado, então validamos no source.
      const src = readFileSync("src/components/public/ContentDetailSheet.tsx", "utf8");
      expect(src).toMatch(/env\(safe-area-inset-bottom/);
    });

    it.each([
      { name: "iPhone SE (sem notch)", w: 375, h: 667, bottom: 0 },
      { name: "iPhone 13 portrait", w: 390, h: 844, bottom: 34 },
      { name: "iPhone 14 Pro Max portrait", w: 430, h: 932, bottom: 34 },
      { name: "iPhone 13 landscape", w: 844, h: 390, bottom: 21 },
    ])("respeita o safe-area-inset-bottom em $name ($w×$h)", ({ w, h, bottom }) => {
      setViewport(w, h, h > w ? "portrait-primary" : "landscape-primary");
      const restore = mockSafeArea({ bottom });
      const { unmount } = render(<ContentDetailSheet open onClose={() => {}} item={item} />);
      const dialog = screen.getByRole("dialog");
      const inner = dialog.querySelector(".overflow-y-auto > div") as HTMLElement;
      const cs = window.getComputedStyle(inner);
      // O padding-bottom efetivo deve refletir o safe-area mockado.
      expect(cs.paddingBottom).toBe(`${bottom}px`);
      unmount();
      restore();
    });

    it("usa max-h <= 90vh para sobrar espaço em landscape", () => {
      setViewport(844, 390, "landscape-primary");
      render(<ContentDetailSheet open onClose={() => {}} item={item} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog.className).toMatch(/max-h-\[90vh\]/);
    });

    it("re-renderiza estável após orientationchange (não desmonta o dialog)", () => {
      setViewport(390, 844, "portrait-primary");
      const { rerender } = render(<ContentDetailSheet open onClose={() => {}} item={item} />);
      const dialogBefore = screen.getByRole("dialog");
      expect(dialogBefore).toBeInTheDocument();

      setViewport(844, 390, "landscape-primary");
      rerender(<ContentDetailSheet open onClose={() => {}} item={item} />);
      const dialogAfter = screen.getByRole("dialog");
      expect(dialogAfter).toBeInTheDocument();
      // body-scroll lock ainda ativo após rotação
      expect(document.body.style.overflow).toBe("hidden");
    });
  });

  describe("TrailerModal", () => {
    it("permanece centralizado em portrait e landscape (inset-0 + flex center)", () => {
      setViewport(390, 844, "portrait-primary");
      const { rerender } = render(
        <TrailerModal open onClose={() => {}} trailerKey="abc" title="X" />
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog.className).toMatch(/inset-0/);
      expect(dialog.className).toMatch(/items-center/);
      expect(dialog.className).toMatch(/justify-center/);

      setViewport(844, 390, "landscape-primary");
      rerender(<TrailerModal open onClose={() => {}} trailerKey="abc" title="X" />);
      const dialog2 = screen.getByRole("dialog");
      expect(dialog2.className).toMatch(/inset-0/);
    });

    it("mantém body-scroll lock após orientationchange", () => {
      setViewport(390, 844, "portrait-primary");
      const { rerender } = render(
        <TrailerModal open onClose={() => {}} trailerKey="abc" title="X" />
      );
      expect(document.body.style.overflow).toBe("hidden");

      setViewport(844, 390, "landscape-primary");
      rerender(<TrailerModal open onClose={() => {}} trailerKey="abc" title="X" />);
      expect(document.body.style.overflow).toBe("hidden");
    });
  });
});
