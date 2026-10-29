// Push segmentado (Meu Canal) — aviso automático de 15 min para os
// jogos que o visitante segue, sem sino por jogo.
//
// O que vai para o banco, POR ENDPOINT e sem conta: as listas de
// times/esportes/competições seguidos + o interruptor do segmento.
// Quem não liga o segmento continua com os follows só no aparelho,
// como antes. O sync é best-effort: erro da RPC nunca quebra o sino
// nem o follow — o pior caso é o segmento ficar desatualizado até o
// próximo sync (que acontece a cada abertura de Meu Canal com o
// segmento ligado).

import type { MeuCanalPrefs } from "@/lib/meuCanal";

export const SEGMENT_PUSH_STORAGE_KEY = "canalbrito:segment-push:v1";

export function loadSegmentEnabled(): boolean {
  try {
    return window.localStorage.getItem(SEGMENT_PUSH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveSegmentEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SEGMENT_PUSH_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Storage indisponível: o segmento vale só nesta sessão.
  }
}

export type SegmentSyncDeps = {
  upsertPreferences: (args: {
    endpoint: string;
    teams: string[];
    sports: string[];
    competitions: string[];
    enabled: boolean;
  }) => Promise<unknown>;
};

/** Grava as preferências de segmento do endpoint. Retorna false se falhou. */
export async function syncSegmentPreferences(
  endpoint: string,
  prefs: MeuCanalPrefs,
  enabled: boolean,
  deps: SegmentSyncDeps
): Promise<boolean> {
  try {
    await deps.upsertPreferences({
      endpoint,
      teams: prefs.teams,
      sports: prefs.sports,
      competitions: prefs.competitions,
      enabled,
    });
    return true;
  } catch {
    return false;
  }
}
