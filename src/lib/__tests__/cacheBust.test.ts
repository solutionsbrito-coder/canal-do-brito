import { describe, it, expect } from "vitest";
import { withCacheBust } from "../cacheBust";

describe("withCacheBust", () => {
  it("returns falsy URL untouched", () => {
    expect(withCacheBust("", "2026-01-01")).toBe("");
    expect(withCacheBust(null, "x")).toBeNull();
    expect(withCacheBust(undefined, "x")).toBeUndefined();
  });

  it("returns blob/data URLs untouched", () => {
    expect(withCacheBust("blob:abc", "x")).toBe("blob:abc");
    expect(withCacheBust("data:image/png;base64,AAA", "x")).toBe("data:image/png;base64,AAA");
  });

  it("returns URL untouched when stamp is empty", () => {
    expect(withCacheBust("https://x/y.png", null)).toBe("https://x/y.png");
    expect(withCacheBust("https://x/y.png", "")).toBe("https://x/y.png");
  });

  it("appends ?v= when there is no query", () => {
    const out = withCacheBust("https://x/y.png", "2026-05-07T10:00:00Z");
    expect(out).toMatch(/^https:\/\/x\/y\.png\?v=[a-z0-9]+$/);
  });

  it("appends &v= when there is already a query", () => {
    const out = withCacheBust("https://x/y.png?w=64", "2026-05-07T10:00:00Z");
    expect(out).toMatch(/^https:\/\/x\/y\.png\?w=64&v=[a-z0-9]+$/);
  });

  it("supports numeric stamps", () => {
    expect(withCacheBust("https://x/y.png", 1714000000000)).toMatch(/\?v=[a-z0-9]+$/);
  });
});
