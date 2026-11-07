import { describe, it, expect } from "vitest";
import { formatGameActivation } from "../UpcomingActivations";

describe("formatGameActivation", () => {
  it("dawn game shows the EFFECTIVE game instant (D+1) and the publish instant separately", () => {
    // Portland x Spurs, 00:00 on 07/11: publish at 07/11 00:00, game at 08/11 00:00
    const lines = formatGameActivation({
      date: "2026-11-07",
      game_time: "00:00",
      publish_at: "2026-11-07T03:00:00+00:00",
    });
    expect(lines.isDawn).toBe(true);
    expect(lines.gameLine).toBe("Jogo 08/11 00:00 · fim do dia");
    expect(lines.publishLine).toBe("Publica 07/11 00:00");
  });

  it("daytime game shows the same-day game time and the publish time", () => {
    const lines = formatGameActivation({
      date: "2026-11-07",
      game_time: "20:00",
      publish_at: "2026-11-07T03:00:00+00:00",
    });
    expect(lines.isDawn).toBe(false);
    expect(lines.gameLine).toBe("Jogo 07/11 20:00");
    expect(lines.publishLine).toBe("Publica 07/11 00:00");
  });

  it("04:59 is still dawn (D+1); 05:00 is not", () => {
    const dawn = formatGameActivation({
      date: "2026-11-07",
      game_time: "04:59",
      publish_at: "2026-11-07T03:00:00+00:00",
    });
    expect(dawn.isDawn).toBe(true);
    expect(dawn.gameLine).toBe("Jogo 08/11 04:59 · fim do dia");

    const day = formatGameActivation({
      date: "2026-11-07",
      game_time: "05:00",
      publish_at: "2026-11-07T03:00:00+00:00",
    });
    expect(day.isDawn).toBe(false);
    expect(day.gameLine).toBe("Jogo 07/11 05:00");
  });
});
