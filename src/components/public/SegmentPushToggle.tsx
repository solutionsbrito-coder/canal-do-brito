import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import type { MeuCanalPrefs } from "@/lib/meuCanal";
import {
  loadSegmentEnabled,
  saveSegmentEnabled,
  syncSegmentPreferences,
} from "@/lib/segmentPush";

/**
 * Aviso automático de Meu Canal — push segmentado.
 *
 * Ligado, o visitante recebe o aviso de 15 min antes de TODOS os jogos
 * do que ele segue, sem tocar sino em cada jogo. O que ele segue vai
 * para o banco por endpoint (sem conta), só quando este interruptor
 * está ligado; desligado, os follows voltam a viver só no aparelho.
 * O sino por jogo continua funcionando junto — a função suprime o
 * duplicado quando sino e segmento batem no mesmo jogo.
 *
 * O sync roda a cada mudança de follows com o segmento ligado (e
 * quando a inscrição chega), sempre best-effort: erro da RPC nunca
 * quebra o follow nem o sino.
 */
export function SegmentPushToggle({ prefs }: { prefs: MeuCanalPrefs }) {
  const { subscription, subscribeDevice, isSupported, settingsLoading } =
    usePushSubscription();
  const [enabled, setEnabled] = useState(() => loadSegmentEnabled());
  const [busy, setBusy] = useState(false);

  const sync = useCallback(
    async (endpoint: string, p: MeuCanalPrefs, en: boolean) => {
      await syncSegmentPreferences(endpoint, p, en, {
        upsertPreferences: (args) =>
          supabase.rpc("upsert_push_preferences", {
            _endpoint: args.endpoint,
            _teams: args.teams,
            _sports: args.sports,
            _competitions: args.competitions,
            _enabled: args.enabled,
          }),
      });
    },
    []
  );

  useEffect(() => {
    if (!enabled || !subscription) return;
    void sync(subscription.endpoint, prefs, true);
  }, [enabled, subscription, prefs, sync]);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        if (subscription) await sync(subscription.endpoint, prefs, false);
        setEnabled(false);
        saveSegmentEnabled(false);
        return;
      }
      const sub = subscription;
      if (!sub) {
        const result = await subscribeDevice();
        if (!result.ok) {
          if (result.reason === "permission-denied") {
            toast.error("Permissão negada — libere nas configurações do site para usar o aviso automático");
          } else if (result.reason === "no-vapid") {
            toast.error("Avisos indisponíveis no momento");
          } else {
            toast.error("Não foi possível ativar o aviso automático");
          }
          return;
        }
        // A inscrição chega ao estado no próximo render; o efeito
        // acima sincroniza as preferências quando ela chegar.
      } else {
        await sync(sub.endpoint, prefs, true);
      }
      setEnabled(true);
      saveSegmentEnabled(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 space-y-2" aria-label="Aviso automático">
      <h2 className="text-[12px] font-bold uppercase tracking-wider text-white/70">
        Aviso automático
      </h2>
      <p className="text-[12.5px] leading-relaxed text-white/65">
        Receba o aviso de 15 min antes de todos os jogos do que você
        segue, sem tocar sino em cada jogo. Vale só neste aparelho.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || !isSupported || settingsLoading}
        aria-label={
          enabled
            ? "Aviso automático ativado para os jogos que você segue"
            : "Ativar aviso automático para os jogos que você segue"
        }
        aria-pressed={enabled}
        className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full text-[12px] font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
          enabled
            ? "bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40"
            : "bg-white/[0.06] text-white/80 border border-white/10 hover:bg-white/10"
        } disabled:opacity-60`}
      >
        {enabled ? (
          <BellRing className="h-4 w-4" aria-hidden />
        ) : (
          <Bell className="h-4 w-4" aria-hidden />
        )}
        {enabled
          ? "Aviso automático ativado ✓"
          : settingsLoading
            ? "Carregando..."
            : !isSupported
              ? "Avisos não suportados neste navegador"
              : "Ativar aviso automático"}
      </button>
      {enabled && (
        <p className="text-[12.5px] leading-relaxed text-[#00ff87]">
          Ligado ✓ — você será avisado 15 min antes de cada jogo do que
          você segue. O sino por jogo continua valendo junto, sem duplicar.
        </p>
      )}
      {!isSupported && (
        <p className="text-[12px] text-white/55">
          Este navegador não suporta notificações push.
        </p>
      )}
    </section>
  );
}
