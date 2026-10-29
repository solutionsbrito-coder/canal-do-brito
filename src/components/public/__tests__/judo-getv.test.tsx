import { describe, it, expect } from "vitest";
import { SPORT_EMOJI, SPORT_LABEL, SPORT_DURATION, detectSportType, isNonAdversarial } from "@/lib/gameUtils";
import { channelHasLogo, isKnownChannel } from "@/components/public/ChannelBadge";

describe("mini-lote judô + ge tv", () => {
  it("judô tem emoji, rótulo e duração próprios e é confronto", () => {
    expect(SPORT_EMOJI.judo).toBe("🥋");
    expect(SPORT_LABEL.judo).toBe("Judô");
    expect(SPORT_DURATION.judo).toBeGreaterThan(0);
    expect(detectSportType("Grand Slam de Judô", "")).toBe("judo");
    expect(isNonAdversarial("judo")).toBe(false);
  });

  it("ge tv passa a ter logo (arte globo)", () => {
    expect(isKnownChannel("ge tv", null)).toBe(true);
    expect(channelHasLogo("ge tv", null)).toBe(true);
    expect(channelHasLogo("GETV", null)).toBe(true);
  });
});
