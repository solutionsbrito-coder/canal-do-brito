import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, Copy, Send, Loader2, Eye, EyeOff, MessageCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { safeCopy } from "@/lib/whatsappText";
import { trackShare, type ShareProps } from "@/lib/analytics";
import { useShareLandingCounts } from "@/hooks/useShareLandingCounts";
import { WPP_FORMATS, type WppFormatId } from "@/lib/whatsappFormats";
import { openWhatsApp, WhatsAppBubble } from "./FormatComposer";
import type { PublicTab } from "@/lib/utils";

interface ShareRow {
  id: string;
  created_at: string;
  surface: string | null;
  tab: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  props: Record<string, unknown> | null;
}

const SURFACE_LABEL: Record<string, string> = {
  "admin-whatsapp-format": "Mensagem pronta",
  "admin-whatsapp-day": "Agenda do dia",
  "admin-whatsapp-template": "Texto pronto",
  "admin-whatsapp-custom": "Mensagem personalizada",
  "admin-whatsapp-ab": "Teste A/B",
  "admin-whatsapp-quick": "Link rápido",
};

const TAB_LABEL: Record<string, string> = {
  live: "Ao Vivo",
  novidades: "Filmes e Séries",
  suggestions: "Sugestões",
  schedule: "Programação",
};

const FORMAT_LABEL: Record<string, string> = Object.fromEntries(
  WPP_FORMATS.map((f) => [f.id, `${f.emoji} ${f.label}`]),
);

const useShareHistory = (limit = 20) =>
  useQuery({
    queryKey: ["analytics", "share_history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("id, created_at, surface, tab, utm_campaign, utm_content, props")
        .eq("event", "link_share")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ShareRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

const shareMetaFromRow = (row: ShareRow, action: ShareProps["action"], message: string): ShareProps => ({
  surface: (row.surface as ShareProps["surface"]) ?? "admin-whatsapp-format",
  tab: (row.tab as PublicTab | null) ?? null,
  utm_campaign: row.utm_campaign,
  utm_content: row.utm_content,
  action,
  format: (row.props?.format as string) ?? null,
  date: (row.props?.date as string) ?? null,
  game_count: typeof row.props?.game_count === "number" ? (row.props.game_count as number) : null,
  message,
  edited: (row.props?.edited as boolean) ?? null,
});

/** Últimos envios/cópias feitos pela aba WhatsApp (registrados em analytics). */
export const ShareHistory = () => {
  const { data, isLoading } = useShareHistory();
  const [openId, setOpenId] = useState<string | null>(null);

  const contents = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.utm_content).filter((c): c is string => !!c))),
    [data],
  );
  const { counts } = useShareLandingCounts(contents, 7);

  const copyAgain = async (row: ShareRow, message: string) => {
    const ok = await safeCopy(message);
    if (!ok) { toast.error("Não foi possível copiar."); return; }
    trackShare(shareMetaFromRow(row, "copy", message));
    toast.success("Mensagem copiada novamente!");
  };

  return (
    <section className="glass-panel rounded-xl p-3 sm:p-4 space-y-3" aria-labelledby="share-history-title">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <History className="h-4 w-4 text-primary" />
          </div>
          <h2 id="share-history-title" className="text-sm font-bold text-foreground">Últimos envios</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">Acessos = aberturas do link nos últimos 7 dias</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-6 text-center space-y-3">
          <p className="text-xs text-muted-foreground">Nenhum envio registrado ainda.</p>
          <p className="text-[10px] text-muted-foreground/60">Use uma mensagem pronta acima — ao copiar ou enviar, o histórico aparece aqui.</p>
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 text-xs"
            onClick={() => document.getElementById("wpp-composer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Copiar mensagem pronta
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {data.map((row) => {
            const action = (row.props?.action as string) ?? "open";
            const isCopy = action === "copy";
            const surface = SURFACE_LABEL[row.surface ?? ""] ?? row.surface ?? "WhatsApp";
            const formatId = row.props?.format as WppFormatId | undefined;
            const formatLabel = formatId ? FORMAT_LABEL[formatId] ?? formatId : null;
            const tab = row.tab ? TAB_LABEL[row.tab] ?? row.tab : null;
            const when = formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR });
            const exact = format(new Date(row.created_at), "dd/MM HH:mm", { locale: ptBR });
            const gameCount = typeof row.props?.game_count === "number" ? (row.props.game_count as number) : null;
            const message = typeof row.props?.message === "string" ? (row.props.message as string) : null;
            const date = typeof row.props?.date === "string" ? (row.props.date as string) : null;
            const clicks = row.utm_content ? counts[row.utm_content] ?? 0 : 0;
            const isOpen = openId === row.id;

            return (
              <li key={row.id} className="py-2 space-y-2">
                <div className="flex items-start gap-3 min-h-11">
                  <span
                    className={`p-1.5 rounded-md shrink-0 mt-0.5 ${isCopy ? "bg-white/[0.04] text-muted-foreground" : "bg-emerald-500/10 text-emerald-300"}`}
                    aria-label={isCopy ? "Copiado" : "Enviado pelo WhatsApp"}
                  >
                    {isCopy ? <Copy className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {formatLabel ?? surface}
                      {tab && <span className="text-muted-foreground font-normal"> · {tab}</span>}
                      {date && <span className="text-muted-foreground font-normal"> · {date.slice(8, 10)}/{date.slice(5, 7)}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      {isCopy ? "Copiado" : "Enviado"} {when} ({exact})
                      {gameCount !== null ? ` · ${gameCount} ${gameCount === 1 ? "jogo" : "jogos"}` : ""}
                      {row.utm_content ? ` · ${row.utm_content}` : ""}
                    </p>
                  </div>
                  {row.utm_content && (
                    <span
                      className={`text-[9px] font-bold rounded px-1.5 py-0.5 border shrink-0 ${clicks > 0 ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" : "text-muted-foreground/60 border-white/[0.08]"}`}
                      title="Aberturas deste link nos últimos 7 dias"
                    >
                      {clicks} acesso{clicks === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {message && (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    <Button size="sm" variant="ghost" className="h-9 text-[11px] gap-1" onClick={() => setOpenId(isOpen ? null : row.id)} aria-expanded={isOpen} aria-label={isOpen ? "Ocultar mensagem" : "Ver mensagem"}>
                      {isOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {isOpen ? "Ocultar" : "Ver mensagem"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 text-[11px] gap-1" onClick={() => copyAgain(row, message)} aria-label="Copiar mensagem novamente">
                      <Copy className="h-3 w-3" /> Copiar novamente
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 text-[11px] gap-1 text-emerald-300" onClick={() => openWhatsApp(message, shareMetaFromRow(row, "open", message))} aria-label="Reenviar mensagem no WhatsApp">
                      <MessageCircle className="h-3 w-3" /> Reenviar
                    </Button>
                  </div>
                )}
                {message && isOpen && <WhatsAppBubble text={message} className="ml-9 max-h-[320px] overflow-y-auto" />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
