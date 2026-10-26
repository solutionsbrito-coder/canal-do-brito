import { describe, it, expect } from "vitest";
import { findChannelMatchSuggestion } from "../useChannelMatchSuggestion";
import type { ChannelMapping } from "../useChannelMappings";
import type { DiscoveredChannel } from "../useDiscoveredChannels";
import { normalizeChannelName } from "@/components/public/channelLogos";

const mk = (name: string, logo_key: any = "globo"): ChannelMapping => ({
  id: `id-${name}`,
  name,
  name_normalized: normalizeChannelName(name),
  logo_key,
  short: null,
  active: true,
});

const orphan = (name: string): DiscoveredChannel => ({
  name,
  normalized: normalizeChannelName(name),
  count: 1,
  isBuiltin: false,
  isOrphan: true,
});

describe("findChannelMatchSuggestion", () => {
  const mappings = [mk("Globo"), mk("ESPN", "espn"), mk("SporTV", "sportv"), mk("Premiere", "premiere")];
  const builtins: Array<{ name: string; logoKey: any }> = [];

  it("matches HD variant with high confidence", () => {
    const s = findChannelMatchSuggestion(orphan("Globo HD"), mappings, builtins);
    expect(s?.confidence).toBe("high");
    expect(s?.target.displayName).toBe("Globo");
  });

  it("matches state suffix (SP) with high confidence", () => {
    const s = findChannelMatchSuggestion(orphan("Globo SP"), mappings, builtins);
    expect(s?.confidence).toBe("high");
    expect(s?.target.displayName).toBe("Globo");
  });

  it("matches numeric suffix (ESPN 2)", () => {
    const s = findChannelMatchSuggestion(orphan("ESPN 2"), mappings, builtins);
    expect(s?.confidence).toBe("high");
    expect(s?.target.displayName).toBe("ESPN");
  });

  it("matches SporTV 3", () => {
    const s = findChannelMatchSuggestion(orphan("SporTV 3"), mappings, builtins);
    expect(s?.confidence).toBe("high");
  });

  it("matches Premiere 2", () => {
    const s = findChannelMatchSuggestion(orphan("Premiere 2"), mappings, builtins);
    expect(s?.confidence).toBe("high");
  });

  it("uses builtin as target when no mapping exists", () => {
    const s = findChannelMatchSuggestion(orphan("DAZN HD"), [], [{ name: "DAZN", logoKey: "dazn" }]);
    expect(s?.confidence).toBe("high");
    expect(s?.target.kind).toBe("builtin");
  });

  it("returns null for unrelated channel", () => {
    const s = findChannelMatchSuggestion(orphan("TV Aratu"), mappings, builtins);
    expect(s).toBeNull();
  });

  it("does not suggest when orphan equals mapping", () => {
    const s = findChannelMatchSuggestion(orphan("Globo"), mappings, builtins);
    expect(s).toBeNull();
  });

  it("prefers most specific (longest) target on prefix match", () => {
    const m = [mk("Premiere"), mk("Premiere Clubes", "premiere")];
    const s = findChannelMatchSuggestion(orphan("Premiere Clubes 2"), m, []);
    expect(s?.target.displayName).toBe("Premiere Clubes");
  });

  it("ignores orphans with too-short normalized name", () => {
    const s = findChannelMatchSuggestion(orphan("AB"), mappings, builtins);
    expect(s).toBeNull();
  });

  it("low confidence on Levenshtein near-match", () => {
    const s = findChannelMatchSuggestion(orphan("Globoo"), mappings, builtins);
    // "globoo" starts with "globo" -> rest "o" not a recognized suffix, but length<=5 -> medium
    expect(s?.confidence === "medium" || s?.confidence === "low").toBe(true);
  });
});
