import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { ContentDetailSheet } from "../ContentDetailSheet";
import { TrailerModal } from "../TrailerModal";
import { __resetBodyScrollLock } from "@/lib/bodyScrollLock";

const baseItem = {
  id: "1",
  title: "Test Movie",
  type: "movie" as const,
  poster: null,
  backdrop: null,
  overview: "Test overview",
  releaseYear: "2024",
  rating: 8.5,
  runtime: 120,
  genres: ["Action"],
};

beforeEach(() => {
  __resetBodyScrollLock();
  document.body.style.overflow = "";
});

afterEach(() => {
  cleanup();
  __resetBodyScrollLock();
  document.body.style.overflow = "";
});

describe("Body scroll lock", () => {
  describe("ContentDetailSheet", () => {
    it("locks body scroll when opened", () => {
      expect(document.body.style.overflow).toBe("");
      render(<ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("does not lock when closed", () => {
      render(<ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("unlocks body scroll when unmounted", () => {
      const { unmount } = render(
        <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("");
    });

    it("unlocks when prop transitions from open=true to open=false", () => {
      const { rerender } = render(
        <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      rerender(<ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("preserves a pre-existing body overflow value on restore", () => {
      document.body.style.overflow = "scroll";
      const { unmount } = render(
        <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("scroll");
    });
  });

  describe("TrailerModal", () => {
    it("locks body scroll when opened", () => {
      render(
        <TrailerModal open={true} onClose={() => {}} trailerKey="abc123" title="x" />,
      );
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("unlocks when closed", () => {
      const { rerender } = render(
        <TrailerModal open={true} onClose={() => {}} trailerKey="abc123" title="x" />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      rerender(
        <TrailerModal open={false} onClose={() => {}} trailerKey="abc123" title="x" />,
      );
      expect(document.body.style.overflow).toBe("");
    });

    it("unlocks on unmount", () => {
      const { unmount } = render(
        <TrailerModal open={true} onClose={() => {}} trailerKey="abc123" title="x" />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Stacked modals (reference counting)", () => {
    it("keeps body locked while any modal remains open", () => {
      const { rerender } = render(
        <>
          <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />
          <TrailerModal open={true} onClose={() => {}} trailerKey="abc" title="x" />
        </>,
      );
      expect(document.body.style.overflow).toBe("hidden");

      // Fecha o trailer; sheet ainda aberto -> permanece travado
      rerender(
        <>
          <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />
          <TrailerModal open={false} onClose={() => {}} trailerKey="abc" title="x" />
        </>,
      );
      expect(document.body.style.overflow).toBe("hidden");

      // Fecha o sheet -> destrava
      rerender(
        <>
          <ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />
          <TrailerModal open={false} onClose={() => {}} trailerKey="abc" title="x" />
        </>,
      );
      expect(document.body.style.overflow).toBe("");
    });

    it("restores scroll after both modals unmount in any order", () => {
      const a = render(
        <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />,
      );
      const b = render(
        <TrailerModal open={true} onClose={() => {}} trailerKey="abc" title="x" />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      a.unmount();
      expect(document.body.style.overflow).toBe("hidden");
      b.unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Edge cases", () => {
    it("does not over-restore when reopened multiple times", () => {
      const { rerender, unmount } = render(
        <ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />,
      );
      rerender(<ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />);
      expect(document.body.style.overflow).toBe("");
      rerender(<ContentDetailSheet open={true} onClose={() => {}} item={baseItem} />);
      expect(document.body.style.overflow).toBe("hidden");
      rerender(<ContentDetailSheet open={false} onClose={() => {}} item={baseItem} />);
      expect(document.body.style.overflow).toBe("");
      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });
});
