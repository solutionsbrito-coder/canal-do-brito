import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TrailerModal } from "../TrailerModal";

describe("TrailerModal", () => {
  afterEach(() => cleanup());

  it("não renderiza quando open=false", () => {
    render(<TrailerModal open={false} onClose={() => {}} trailerKey="abc" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza via portal no body com z-[100]", () => {
    render(<TrailerModal open={true} onClose={() => {}} trailerKey="abc" title="X" />);
    const dialog = screen.getByRole("dialog");
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.className).toMatch(/z-\[100\]/);
  });

  it("mostra iframe do YouTube com a key correta (nocookie + playsinline)", () => {
    render(<TrailerModal open={true} onClose={() => {}} trailerKey="abc123" />);
    const iframe = document.querySelector("iframe");
    const src = iframe?.getAttribute("src") ?? "";
    expect(src).toContain("youtube-nocookie.com/embed/abc123");
    expect(src).toContain("playsinline=1");
    expect(src).toContain("autoplay=1");
  });

  it("mostra loader quando loading=true", () => {
    render(<TrailerModal open={true} onClose={() => {}} trailerKey={null} loading />);
    expect(document.body.querySelector(".animate-spin")).toBeTruthy();
  });

  it("mostra fallback com link de busca no YouTube quando não há trailer", () => {
    render(<TrailerModal open={true} onClose={() => {}} trailerKey={null} title="Como Mágica" />);
    expect(screen.getByText("Trailer não disponível")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Procurar no YouTube/i }) as HTMLAnchorElement;
    expect(link.href).toContain("youtube.com/results");
    expect(decodeURIComponent(link.href)).toContain("Como Mágica trailer");
    expect(link.target).toBe("_blank");
  });

  it("dispara onClose ao clicar no botão fechar", () => {
    const onClose = vi.fn();
    render(<TrailerModal open={true} onClose={onClose} trailerKey="abc" />);
    fireEvent.click(screen.getByLabelText("Fechar trailer"));
    expect(onClose).toHaveBeenCalled();
  });

  it("fecha com ESC", () => {
    const onClose = vi.fn();
    render(<TrailerModal open={true} onClose={onClose} trailerKey="abc" />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
