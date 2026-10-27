import { useCallback, useEffect, useState } from "react";

/**
 * Espelho local (neste dispositivo) dos lembretes de 15 min.
 *
 * A fonte da verdade do ENVIO é o servidor: o sino grava o game_id na
 * inscrição push do dispositivo (RPC add_push_game_id, por endpoint,
 * sem login) e a Edge Function send-push-notifications dispara 15 min
 * antes e remove o id após enviar. Este Set local existe só para a UI
 * saber, sem uma leitura extra ao banco, quais sinos estão ativos.
 * Se o visitante limpar os dados do navegador, o sino pode voltar a
 * aparecer desligado mesmo com o envio ainda agendado no servidor —
 * o lembrete em si não depende deste espelho.
 */
export const REMINDERS_STORAGE_KEY = "canalbrito:reminders:v1";

function loadReminded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function saveReminded(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignora: o envio no servidor já foi registrado.
  }
}

export function useRemindedGames() {
  const [reminded, setReminded] = useState<Set<string>>(() => loadReminded());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === REMINDERS_STORAGE_KEY) setReminded(loadReminded());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markReminded = useCallback((gameId: string) => {
    setReminded((prev) => {
      const next = new Set(prev);
      next.add(gameId);
      saveReminded(next);
      return next;
    });
  }, []);

  const unmarkReminded = useCallback((gameId: string) => {
    setReminded((prev) => {
      const next = new Set(prev);
      next.delete(gameId);
      saveReminded(next);
      return next;
    });
  }, []);

  return { reminded, markReminded, unmarkReminded };
}
