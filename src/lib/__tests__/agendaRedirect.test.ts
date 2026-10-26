import { describe, it, expect } from "vitest";
import { buildProgramacaoRedirect, isValidDateParam } from "../agendaRedirect";

describe("isValidDateParam", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(isValidDateParam("2026-05-20")).toBe(true);
  });
  it("rejects malformed", () => {
    expect(isValidDateParam("hoje")).toBe(false);
    expect(isValidDateParam("2026-5-20")).toBe(false);
  });
  it("rejects impossible dates", () => {
    expect(isValidDateParam("2026-13-40")).toBe(false);
    expect(isValidDateParam("2026-02-30")).toBe(false);
  });
});

describe("buildProgramacaoRedirect", () => {
  it("preserves valid date", () => {
    expect(buildProgramacaoRedirect("?date=2026-05-20")).toBe(
      "/programacao?date=2026-05-20"
    );
  });
  it("drops invalid date", () => {
    expect(buildProgramacaoRedirect("?date=invalida")).toBe("/programacao");
    expect(buildProgramacaoRedirect("?date=2026-13-40")).toBe("/programacao");
  });
  it("preserves UTMs alongside date", () => {
    const out = buildProgramacaoRedirect(
      "?utm_source=wa&utm_campaign=x&date=2026-05-20"
    );
    const url = new URL(out, "https://x");
    expect(url.pathname).toBe("/programacao");
    expect(url.searchParams.get("date")).toBe("2026-05-20");
    expect(url.searchParams.get("utm_source")).toBe("wa");
    expect(url.searchParams.get("utm_campaign")).toBe("x");
  });
  it("drops unknown params", () => {
    expect(buildProgramacaoRedirect("?foo=bar&date=2026-05-20")).toBe(
      "/programacao?date=2026-05-20"
    );
  });
  it("preserves hash", () => {
    expect(buildProgramacaoRedirect("", "#secao")).toBe("/programacao#secao");
  });
  it("handles empty search", () => {
    expect(buildProgramacaoRedirect("")).toBe("/programacao");
  });
  it("normalizes legacy tab slug", () => {
    expect(buildProgramacaoRedirect("?tab=ao-vivo")).toBe(
      "/programacao?tab=programacao"
    );
  });
});
