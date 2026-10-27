import { describe, expect, it } from "vitest";
import { splitChannels, weekdayPtBr, wrapText } from "@/lib/shareCard";

// ctx mínimo: measureText aproxima cada caractere por 10 px.
const ctx = {
  measureText: (t: string) => ({ width: t.length * 10 }),
} as unknown as CanvasRenderingContext2D;

describe("Lote 2.4 — card de compartilhamento", () => {
  it("selo de data: dia da semana correto", () => {
    expect(weekdayPtBr("2026-10-27")).toBe("terça");
    expect(weekdayPtBr("2026-10-26")).toBe("segunda");
    expect(weekdayPtBr("invalida")).toBe("");
  });

  it("chips: separa por • e ignora vazios", () => {
    expect(splitChannels("Premiere • SporTV •  ")).toEqual(["Premiere", "SporTV"]);
    expect(splitChannels("")).toEqual([]);
  });

  it("wrapText: quebra sem estourar a largura", () => {
    const lines = wrapText(ctx, "Teste A x Teste B", 100);
    expect(lines).toEqual(["Teste A x", "Teste B"]);
    expect(wrapText(ctx, "Curto", 100)).toEqual(["Curto"]);
  });
});
