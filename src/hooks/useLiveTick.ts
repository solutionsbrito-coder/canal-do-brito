import { useState, useEffect } from "react";

/**
 * Centralized 60-second tick for live-status components.
 * Replaces duplicate setInterval timers across AppNavbar, Hero, LiveNowHero, DailyGamesSection.
 */
export const useLiveTick = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return tick;
};
