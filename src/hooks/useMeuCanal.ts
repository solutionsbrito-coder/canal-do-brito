import { useCallback, useEffect, useState } from "react";
import {
  loadMeuCanalPrefs,
  saveMeuCanalPrefs,
  toggleFollowCompetition,
  toggleFollowSport,
  toggleFollowTeam,
  MEU_CANAL_STORAGE_KEY,
  type MeuCanalPrefs,
} from "@/lib/meuCanal";

/**
 * Estado das preferências do Meu Canal, sincronizado com o localStorage
 * deste dispositivo (sem login, sem conta, sem banco).
 */
export function useMeuCanal() {
  const [prefs, setPrefs] = useState<MeuCanalPrefs>(() => loadMeuCanalPrefs());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MEU_CANAL_STORAGE_KEY) setPrefs(loadMeuCanalPrefs());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: MeuCanalPrefs) => {
    setPrefs(next);
    saveMeuCanalPrefs(next);
  }, []);

  const toggleTeam = useCallback(
    (team: string) => update(toggleFollowTeam(prefs, team)),
    [prefs, update],
  );
  const toggleSport = useCallback(
    (sport: string) => update(toggleFollowSport(prefs, sport)),
    [prefs, update],
  );
  const toggleCompetition = useCallback(
    (competition: string) => update(toggleFollowCompetition(prefs, competition)),
    [prefs, update],
  );
  const clearAll = useCallback(() => update({ teams: [], sports: [], competitions: [] }), [update]);

  return { prefs, toggleTeam, toggleSport, toggleCompetition, clearAll };
}
