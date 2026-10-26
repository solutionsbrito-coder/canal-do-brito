import { describe, it, expect, vi, afterEach } from "vitest";
import { formatCountdown } from "./dateUtils";

describe("formatCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Em breve" for past dates', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(formatCountdown(past)).toBe("Em breve");
  });

  it("returns minutes for < 1 hour", () => {
    vi.useFakeTimers({ now: new Date("2026-03-19T12:00:00Z") });
    expect(formatCountdown("2026-03-19T12:30:00Z")).toBe("Publica em 30min");
  });

  it("returns hours for < 24 hours", () => {
    vi.useFakeTimers({ now: new Date("2026-03-19T12:00:00Z") });
    expect(formatCountdown("2026-03-19T18:00:00Z")).toBe("Publica em 6h");
  });

  it('returns "Publica amanhã" for 1 day', () => {
    vi.useFakeTimers({ now: new Date("2026-03-19T12:00:00Z") });
    expect(formatCountdown("2026-03-20T18:00:00Z")).toBe("Publica amanhã");
  });

  it("returns days for > 1 day", () => {
    vi.useFakeTimers({ now: new Date("2026-03-19T12:00:00Z") });
    expect(formatCountdown("2026-03-22T12:00:00Z")).toBe("Publica em 3d");
  });
});
