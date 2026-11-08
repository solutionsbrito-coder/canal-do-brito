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

  it("only 00:00 is dawn (D+1); 00:10, 04:59 and 05:00 are not", () => {
    const midnight = formatGameActivation({
      date: "2026-11-07",
      game_time: "00:00",
      publish_at: "2026-11-07T03:00:00+00:00",
    });
    expect(midnight.isDawn).toBe(true);
    expect(midnight.gameLine).toBe("Jogo 08/11 00:00 · fim do dia");

    for (const time of ["00:10", "04:59", "05:00"]) {
      const day = formatGameActivation({
        date: "2026-11-07",
        game_time: time,
        publish_at: "2026-11-07T03:00:00+00:00",
      });
      expect(day.isDawn).toBe(false);
      expect(day.gameLine).toBe(`Jogo 07/11 ${time}`);
    }
  });
});
