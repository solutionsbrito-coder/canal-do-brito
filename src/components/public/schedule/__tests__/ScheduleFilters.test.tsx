import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduleFilters } from "../ScheduleFilters";

const baseProps = {
  availableSports: ["football", "basketball"] as any,
  availableComps: [
    { label: "Brasileirão", count: 5 },
    { label: "NBA", count: 2 },
  ],
  availableChannels: [
    { label: "Globo", count: 3 },
    { label: "ESPN", count: 2 },
  ],
  sportFilter: null,
  compFilter: null,
  channelFilter: null,
  openFilter: null,
  onToggleFilter: vi.fn(),
  onSportFilter: vi.fn(),
  onCompFilter: vi.fn(),
  onChannelFilter: vi.fn(),
  onClearAll: vi.fn(),
};

describe("ScheduleFilters", () => {
  it("renders the three filter category buttons when multiple options", () => {
    render(<ScheduleFilters {...baseProps} />);
    expect(screen.getByText("Esporte")).toBeInTheDocument();
    expect(screen.getByText("Competição")).toBeInTheDocument();
    expect(screen.getByText("Canal")).toBeInTheDocument();
  });

  it("invokes onToggleFilter when category clicked", () => {
    const onToggleFilter = vi.fn();
    render(<ScheduleFilters {...baseProps} onToggleFilter={onToggleFilter} />);
    fireEvent.click(screen.getByText("Esporte"));
    expect(onToggleFilter).toHaveBeenCalledWith("sport");
  });

  it("renders clear-all when any filter active", () => {
    const onClearAll = vi.fn();
    render(<ScheduleFilters {...baseProps} sportFilter="football" onClearAll={onClearAll} />);
    fireEvent.click(screen.getByLabelText(/limpar todos/i));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("hides categories with single option", () => {
    render(<ScheduleFilters {...baseProps} availableSports={["football"] as any} />);
    expect(screen.queryByText("Esporte")).toBeNull();
  });
});
