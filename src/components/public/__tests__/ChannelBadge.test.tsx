import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChannelBadge } from "../ChannelBadge";

vi.mock("@/hooks/useChannelMappings", () => ({
  useChannelMappings: () => ({ data: new Map() }),
  CHANNEL_MAPPINGS_QK: ["channel_logo_mappings"] as const,
}));

describe("ChannelBadge", () => {
  it("renders known channel name", () => {
    render(<ChannelBadge name="ESPN" />);
    expect(screen.getByText("ESPN")).toBeInTheDocument();
  });

  it("renders SporTV name", () => {
    render(<ChannelBadge name="SporTV" />);
    expect(screen.getByText("SporTV")).toBeInTheDocument();
  });

  it("renders unknown channel with name and initials chip", () => {
    render(<ChannelBadge name="Canal Desconhecido" />);
    const badge = screen.getByText("Canal Desconhecido");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("span")).toHaveTextContent("DES");
  });

  it("renders Prime Video full name (never abbreviated)", () => {
    render(<ChannelBadge name="Prime Video" />);
    expect(screen.getByText("Prime Video")).toBeInTheDocument();
    expect(screen.queryByText("Prime")).toBeNull();
  });

  it("renders Canal do Brito with special styling and full name", () => {
    render(<ChannelBadge name="Canal do Brito" />);
    expect(screen.getByAltText("Canal do Brito")).toBeInTheDocument();
    expect(screen.getByText("Canal do Brito")).toBeInTheDocument();
  });
});
