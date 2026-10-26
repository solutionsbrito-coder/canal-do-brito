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

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!vapidPublicKey) return null;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Seu navegador não suporta notificações push");
      return null;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permissão de notificação negada");
        return null;
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

      return sub;
    } catch (err) {
      console.error("Push subscribe error:", err);
      toast.error("Erro ao ativar notificações");
      return null;
    }
  }, [vapidPublicKey]);

  const addGameReminder = useCallback(
    async (gameId: string) => {
      let sub = subscription;
      if (!sub) {
        sub = await subscribe();
        if (!sub) return false;
      }

      const { error } = await supabase.rpc("add_push_game_id", {
        _endpoint: sub.endpoint,
        _game_id: gameId,
      });

      if (error) {
        console.error("addGameReminder error:", error);
        return false;
      }
      return true;
    },
    [subscription, subscribe]
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
    subscription,
    subscribe,
    addGameReminder,
    removeGameReminder,
    isSupported: typeof window !== "undefined" && "PushManager" in window,
  };
}
