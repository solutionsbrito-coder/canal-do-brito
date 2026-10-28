import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function syncKeysToDb(sub: PushSubscription) {
  const json = sub.toJSON();
  const keys = json.keys as { p256dh: string; auth: string };
  await supabase.rpc("upsert_push_subscription", {
    _endpoint: sub.endpoint,
    _p256dh: keys.p256dh,
    _auth: keys.auth,
  });
}

/**
 * Por que um lembrete falhou — sem esse motivo, a UI só consegue
 * mostrar um erro genérico ("verifique se as notificações estão
 * liberadas"), que é enganoso quando a causa é outra (sem chave
 * VAPID, erro de rede/inscrição, erro ao salvar no banco). Cada
 * motivo tem uma mensagem e uma ação distinta na UI do sino.
 */
export type AddReminderFailureReason =
  | "permission-denied" // Permissão negada (ou negada no pedido): só as configurações resolvem.
  | "no-vapid" // Chave VAPID pública ausente em settings: problema do site, não do visitante.
  | "unsupported" // Navegador sem PushManager/service worker.
  | "subscribe-error" // Falha ao criar a inscrição push (rede, SW, chave inválida).
  | "rpc-error"; // Inscrição criada, mas o game_id não foi salvo no banco.

// Objeto único (não união discriminada): o projeto roda com
// strictNullChecks desligado, e sem ele o TS não estreita uniões
// por discriminante — acessar .reason numa união quebra o build.
export type AddReminderResult = {
  ok: boolean;
  reason?: AddReminderFailureReason;
};

export function usePushSubscription() {
  const { data: settings } = useSettings();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const vapidPublicKey = settings?.vapid_public_key;

  // On mount: check existing subscription via the unified SW and re-sync keys
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        // Always re-sync keys in case browser rotated them
        syncKeysToDb(sub).catch(() => {});
      }
    });
  }, []);

  /**
   * Releitura da permissão atual, sem pedir nada ao sistema. Usada
   * pelo sino antes de decidir o que mostrar: depois que o visitante
   * libera a notificação nas configurações do aparelho, o estado do
   * hook pode estar desatualizado — só essa leitura diz a verdade.
   */
  const refreshPermission = useCallback((): NotificationPermission => {
    const current =
      typeof Notification !== "undefined" ? Notification.permission : permission;
    setPermission(current);
    return current;
  }, [permission]);

  /**
   * Inscrição detalhada (sem toasts): quem chama decide a mensagem.
   * Regra importante: com a permissão já negada, NÃO chama
   * requestPermission() de novo — o sistema não pergunta outra vez
   * e a chamada só devolveria "denied" em silêncio. Nesse caso a UI
   * deve mostrar o passo a passo das configurações, não um pedido.
   */
  const subscribeDetailed = useCallback(async (): Promise<{
    ok: boolean;
    sub?: PushSubscription;
    reason?: AddReminderFailureReason;
  }> => {
    if (!vapidPublicKey) return { ok: false, reason: "no-vapid" };
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, reason: "unsupported" };
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setPermission("denied");
      return { ok: false, reason: "permission-denied" };
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        return { ok: false, reason: "permission-denied" };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });
      }
      setSubscription(sub);
      await syncKeysToDb(sub);

      return { ok: true, sub };
    } catch (err) {
      console.error("Push subscribe error:", err);
      return { ok: false, reason: "subscribe-error" };
    }
  }, [vapidPublicKey]);

  /**
   * Inscrição do aparelho, sem toasts e sem jogo: usada pelo botão
   * global de notificações (Meu Canal). Ele só libera a inscrição
   * do aparelho — os lembretes continuam sendo por jogo, no sino.
   * Quem chama decide a mensagem a partir de ok/reason.
   */
  const subscribeDevice = useCallback(async (): Promise<{
    ok: boolean;
    reason?: AddReminderFailureReason;
  }> => {
    const result = await subscribeDetailed();
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }, [subscribeDetailed]);

  // Compatibilidade: o sino compacto (DailyGamesSection) usa boolean.
  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    const result = await subscribeDetailed();
    if (result.ok) {
      return result.sub;
    }
    if (result.reason === "unsupported") {
      toast.error("Seu navegador não suporta notificações push");
    } else if (result.reason === "permission-denied") {
      toast.error("Permissão de notificação negada");
    } else if (result.reason === "no-vapid") {
      toast.error("Lembretes indisponíveis no momento. Use a agenda (.ics).");
    } else {
      toast.error("Erro ao ativar notificações");
    }
    return null;
  }, [subscribeDetailed]);

  const addGameReminderWithReason = useCallback(
    async (gameId: string): Promise<AddReminderResult> => {
      let sub = subscription;
      if (!sub) {
        const result = await subscribeDetailed();
        if (!result.ok) return result;
        sub = result.sub;
      }

      const { error } = await supabase.rpc("add_push_game_id", {
        _endpoint: sub.endpoint,
        _game_id: gameId,
      });

      if (error) {
        console.error("addGameReminder error:", error);
        return { ok: false, reason: "rpc-error" };
      }
      return { ok: true };
    },
    [subscription, subscribeDetailed]
  );

  const addGameReminder = useCallback(
    async (gameId: string) => {
      const result = await addGameReminderWithReason(gameId);
      return result.ok;
    },
    [addGameReminderWithReason]
  );

  const removeGameReminder = useCallback(
    async (gameId: string) => {
      if (!subscription) return false;

      const { error } = await supabase.rpc("remove_push_game_id", {
        _endpoint: subscription.endpoint,
        _game_id: gameId,
      });

      if (error) {
        console.error("removeGameReminder error:", error);
        return false;
      }
      return true;
    },
    [subscription]
  );

  return {
    permission,
    refreshPermission,
    subscription,
    subscribe,
    subscribeDevice,
    addGameReminder,
    addGameReminderWithReason,
    removeGameReminder,
    isSupported: typeof window !== "undefined" && "PushManager" in window,
  };
}
