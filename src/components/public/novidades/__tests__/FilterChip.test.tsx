import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterChip } from "../FilterChip";

describe("FilterChip", () => {
  it("renders label, icon and count", () => {
    render(<FilterChip icon="🎬" label="Filmes" count={7} active={false} onClick={() => {}} />);
    expect(screen.getByText("Filmes")).toBeInTheDocument();
    expect(screen.getByText("🎬")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("reflects active state via aria-pressed", () => {
    const { rerender } = render(<FilterChip icon="✨" label="Todos" count={3} active={false} onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(<FilterChip icon="✨" label="Todos" count={3} active onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("invokes onClick", () => {
    const onClick = vi.fn();
    render(<FilterChip icon="⭐" label="Estreias" count={2} active={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
