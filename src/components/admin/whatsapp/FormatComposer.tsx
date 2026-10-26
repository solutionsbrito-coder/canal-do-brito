import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Copy, Check, MessageCircle, RotateCcw, AlertTriangle, Link2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import type { DailyGame } from "@/hooks/useDailyGames";
import { useActiveMovies } from "@/hooks/useMovies";
import { useActiveSeries } from "@/hooks/useSeries";
import { useActiveNewsReleases } from "@/hooks/useNewsReleases";
import { useChannelMappings } from "@/hooks/useChannelMappings";
import { normalizeChannelList } from "@/lib/channelResolver";
import { buildDeepLink, TAB_SLUGS } from "@/lib/utils";
import { trackShare, type ShareProps } from "@/lib/analytics";
import { safeCopy } from "@/lib/whatsappText";
import {
  WPP_FORMATS, getFormatMeta, type WppFormatId, type WppMessageResult,
  buildFullMessage, buildShortMessage, buildLiveMessage, buildUpcomingMessage, buildContentMessage,
} from "@/lib/whatsappFormats";

const MESSAGE_LOG_MAX = 2500;

/** Abre o WhatsApp com a mensagem preenchida (o admin decide enviar). */
export const openWhatsApp = async (text: string, share: ShareProps) => {
  trackShare(share);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win && !win.closed) return;
  const copied = await safeCopy(text);
  if (copied) {
    toast.success("Popup bloqueado. Mensagem copiada — cole no WhatsApp.", {
      action: { label: "Abrir WhatsApp", onClick: () => { window.location.href = url; } },
      duration: 6000,
    });
  } else {
    toast.error("Popup bloqueado e não foi possível copiar. Permita pop-ups para enviar.");
  }
};

/** Prévia com cara de balão do WhatsApp. */
export const WhatsAppBubble = ({ text, className = "" }: { text: string; className?: string }) => (
  <div className={`rounded-xl bg-[hsl(160,20%,9%)] border border-white/[0.06] p-3 sm:p-4 ${className}`} aria-label="Prévia da mensagem">
    <div className="relative max-w-[92%] sm:max-w-[78%] rounded-2xl rounded-tl-sm bg-[hsl(150,45%,14%)] border border-[hsl(150,45%,22%)] px-3 py-2 shadow-lg">
      <pre className="font-sans text-[12.5px] sm:text-[13px] text-foreground/95 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
        {text || <span className="text-muted-foreground italic">Mensagem vazia</span>}
      </pre>
      <span className="block text-right text-[9px] text-muted-foreground/70 mt-1">agora ✓✓</span>
    </div>
  </div>
);

interface Props {
  games: DailyGame[] | undefined;
  gamesLoading: boolean;
  dateStr: string;
  todayStr: string;
  siteUrl: string;
}

export const FormatComposer = ({ games, gamesLoading, dateStr, todayStr, siteUrl }: Props) => {
  const [formatId, setFormatId] = useState<WppFormatId>("completa");
  const [upcomingLimit, setUpcomingLimit] = useState(5);
  const [edits, setEdits] = useState<Partial<Record<WppFormatId, string>>>({});
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = getFormatMeta(formatId);
  const isContent = formatId === "filmes-series";

  const { data: mappings } = useChannelMappings();
  const { data: movies } = useActiveMovies();
  const { data: series } = useActiveSeries();
  const { data: news } = useActiveNewsReleases();

  // Canais já normalizados (mesma regra do público).
  const normalizedGames = useMemo(
    () => (games ?? []).map((g) => ({ ...g, channels: normalizeChannelList(g.channels, mappings ?? null) })),
    [games, mappings],
  );

  const link = useMemo(() => {
    try {
      const base = buildDeepLink(siteUrl, meta.tab, { short: true, content: meta.utmContent });
      if (meta.tab === "schedule" && dateStr !== todayStr) return `${base}${base.includes("?") ? "&" : "?"}date=${dateStr}`;
      return base;
    } catch {
      // Se o link rastreado falhar, usa o link público normal.
      return `${siteUrl.replace(/\/$/, "")}/${TAB_SLUGS[meta.tab]}`;
    }
  }, [siteUrl, meta, dateStr, todayStr]);

  const result: WppMessageResult = useMemo(() => {
    const opts = { dateStr, link, todayStr };
    switch (formatId) {
      case "curta": return buildShortMessage(normalizedGames, opts);
      case "ao-vivo": return buildLiveMessage(normalizedGames, opts);
      case "proximos": return buildUpcomingMessage(normalizedGames, { ...opts, limit: upcomingLimit });
      case "filmes-series": return buildContentMessage(
        { movies: movies ?? [], series: series ?? [], news: news ?? [] },
        { link },
      );
      default: return buildFullMessage(normalizedGames, opts);
    }
  }, [formatId, normalizedGames, dateStr, link, todayStr, upcomingLimit, movies, series, news]);

  const edited = edits[formatId];
  const isEdited = edited !== undefined && edited !== result.text;
  const finalText = (edited ?? result.text).trim();
  const canShare = finalText.length > 0 && !gamesLoading;

  // Ao trocar de data/formato o modo de edição fecha para mostrar a prévia nova.
  useEffect(() => { setEditing(false); }, [formatId, dateStr]);

  const shareMeta = (action: ShareProps["action"]): ShareProps => ({
    surface: "admin-whatsapp-format",
    tab: meta.tab,
    utm_campaign: `share-${TAB_SLUGS[meta.tab]}`,
    utm_content: meta.utmContent,
    action,
    format: formatId,
    date: isContent ? null : dateStr,
    game_count: result.count,
    edited: isEdited,
    message: finalText.slice(0, MESSAGE_LOG_MAX),
  });

  const onCopy = async () => {
    if (!canShare) return;
    const ok = await safeCopy(finalText);
    if (!ok) { toast.error("Não foi possível copiar. Selecione e copie manualmente."); return; }
    trackShare(shareMeta("copy"));
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const onSend = () => { if (canShare) void openWhatsApp(finalText, shareMeta("open")); };
  const onRestore = () => {
    setEdits((e) => { const n = { ...e }; delete n[formatId]; return n; });
    toast.success("Texto padrão restaurado.");
  };

  const [, m, d] = dateStr.split("-");

  return (
    <section id="wpp-composer" className="glass-panel rounded-xl p-3 sm:p-4 space-y-3 min-w-0 scroll-mt-24" aria-labelledby="wpp-format-title">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 id="wpp-format-title" className="text-sm font-bold text-foreground">Mensagem pronta</h3>
        <span className="text-[10px] text-muted-foreground">
          {isContent ? "Catálogo atual" : `Programação de ${d}/${m}`}
          {!isContent && !gamesLoading && ` · ${result.count} ${result.count === 1 ? "jogo" : "jogos"} na mensagem`}
        </span>
      </div>

      {/* Seletor de formato */}
      <div role="radiogroup" aria-label="Formato da mensagem" className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
        {WPP_FORMATS.map((f) => {
          const active = f.id === formatId;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={f.description}
              onClick={() => setFormatId(f.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors min-h-11 ${
                active
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.18]"
              }`}
            >
              <span aria-hidden>{f.emoji}</span> {f.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">{meta.description}.</p>

      {formatId === "proximos" && (
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Quantidade de próximos jogos
          <Input
            type="number"
            min={1}
            max={20}
            value={upcomingLimit}
            onChange={(e) => setUpcomingLimit(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="h-9 w-20 text-xs glass-panel border-white/[0.08]"
            aria-label="Quantidade de próximos jogos"
          />
        </label>
      )}

      {/* Avisos */}
      {result.warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-0.5" aria-live="polite">
          {result.warnings.map((w) => (
            <li key={w} className="text-[11px] text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}

      {/* Prévia / edição */}
      {gamesLoading && !isContent ? (
        <div className="h-40 rounded-xl shimmer" aria-busy="true" aria-label="Carregando jogos" />
      ) : editing ? (
        <div className="space-y-1">
          <label htmlFor="wpp-format-edit" className="text-[11px] font-semibold text-foreground">Editar mensagem</label>
          <Textarea
            id="wpp-format-edit"
            value={edited ?? result.text}
            onChange={(e) => setEdits((prev) => ({ ...prev, [formatId]: e.target.value.slice(0, 4096) }))}
            maxLength={4096}
            className="text-xs min-h-[220px] bg-background/50 border-border/30 font-mono"
          />
          <p className="text-[10px] text-muted-foreground/60">{finalText.length} caracteres · *negrito* funciona no WhatsApp</p>
        </div>
      ) : (
        <WhatsAppBubble text={finalText} className="max-h-[420px] overflow-y-auto" />
      )}

      {/* Link rastreado */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
        <Link2 className="h-3 w-3 shrink-0 text-primary" aria-hidden />
        <span className="shrink-0">Link:</span>
        <code className="truncate bg-background/50 rounded px-1.5 py-0.5" title={link}>{link}</code>
        <span className="shrink-0 text-primary font-bold" title={`utm_content=${meta.utmContent}`}>● rastreado</span>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          className="gap-1.5 text-xs min-h-[44px]"
          aria-pressed={editing}
          aria-label={editing ? "Ver prévia da mensagem" : "Editar mensagem antes de enviar"}
        >
          {editing ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? "Prévia" : "Editar"}
        </Button>
        {isEdited && (
          <Button size="sm" variant="ghost" onClick={onRestore} className="gap-1.5 text-xs min-h-[44px]" aria-label="Restaurar texto padrão">
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
          </Button>
        )}
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            disabled={!canShare}
            className="flex-1 gap-1.5 text-xs min-h-[44px]"
            aria-label={`Copiar mensagem ${meta.label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button
            size="sm"
            onClick={onSend}
            disabled={!canShare}
            className="flex-1 gap-1.5 text-xs bg-[hsl(142,70%,38%)] hover:bg-[hsl(142,70%,32%)] text-white min-h-[44px]"
            aria-label={`Enviar mensagem ${meta.label} no WhatsApp`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Enviar no WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
};
