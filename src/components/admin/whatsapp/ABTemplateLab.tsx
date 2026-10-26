import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Beaker, Copy, Check, MessageCircle, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteUrl } from "@/hooks/useSiteUrl";
import { buildDeepLink, TAB_SLUGS, type PublicTab } from "@/lib/utils";
import { trackShare } from "@/lib/analytics";
import { safeCopy } from "@/lib/whatsappText";
import {
  loadABTemplates, saveABTemplates, resetABTemplates, abUtmContent, renderTemplate,
  type ABTemplate, type Variant,
} from "@/lib/abTemplates";

interface FunnelRow {
  template_id: string;
  variant: Variant;
  shares_copy: number;
  shares_open: number;
  landings: number;
  ctr: number; // landings / (copy+open)
}

const VARIANTS: Variant[] = ["A", "B"];
const TABS: PublicTab[] = ["schedule", "novidades"];

const openWhatsApp = (text: string) => {
  const win = window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  if (!win) toast.error("Popup bloqueado. Permita pop-ups para enviar.");
};

const VariantCard = ({
  template, variant, link, onChangeText, onShared,
}: {
  template: ABTemplate;
  variant: Variant;
  link: string;
  onChangeText: (text: string) => void;
  onShared: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const text = template.variants[variant].text;
  const final = renderTemplate(text, link);

  const utmContent = abUtmContent(template.id, variant);
  const shareMeta = {
    surface: "admin-whatsapp-ab" as const,
    tab: template.tab ?? null,
    utm_campaign: template.tab ? `share-${TAB_SLUGS[template.tab]}` : "share-home",
    utm_content: utmContent,
  };

  const onCopy = async () => {
    const ok = await safeCopy(final);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare({ ...shareMeta, action: "copy" });
      onShared();
      toast.success(`Variante ${variant} copiada`);
    } else {
      toast.error("Não foi possível copiar.");
    }
  };

  const onSend = () => {
    trackShare({ ...shareMeta, action: "open" });
    onShared();
    openWhatsApp(final);
  };

  return (
    <div className="rounded-lg border border-white/[0.08] bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wider text-primary">VARIANTE {variant}</span>
        <code className="text-[9px] text-muted-foreground/70 truncate" title={utmContent}>{utmContent}</code>
      </div>
      <Textarea
        value={text}
        onChange={(e) => onChangeText(e.target.value.slice(0, 2048))}
        className="text-xs min-h-[100px] bg-background/50 border-border/30"
        placeholder="Use {LINK} para inserir o link rastreado…"
      />
      <pre className="text-[10px] text-muted-foreground/80 whitespace-pre-wrap bg-background/30 rounded p-2 max-h-[100px] overflow-y-auto">
        {final || "(vazio)"}
      </pre>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} className="flex-1 gap-1.5 text-xs min-h-[40px]">
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button
          size="sm"
          disabled={!text.trim()}
          onClick={onSend}
          className="flex-1 gap-1.5 text-xs bg-[hsl(142,70%,38%)] hover:bg-[hsl(142,70%,32%)] text-white min-h-[40px]"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Enviar
        </Button>
      </div>
    </div>
  );
};

const FunnelStat = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
  <div className={`rounded-md px-2 py-1 ${accent ? "bg-primary/10 border border-primary/30" : "bg-background/40 border border-white/[0.06]"}`}>
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
    <div className={`text-xs font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
  </div>
);

export const ABTemplateLab = () => {
  const siteUrl = useSiteUrl();
  const [templates, setTemplates] = useState<ABTemplate[]>(() => loadABTemplates());
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [windowDays, setWindowDays] = useState<7 | 30>(7);

  useEffect(() => { saveABTemplates(templates); }, [templates]);

  const updateVariantText = (id: string, variant: Variant, text: string) => {
    setTemplates((prev) => prev.map((t) =>
      t.id === id ? { ...t, variants: { ...t.variants, [variant]: { text } } } : t,
    ));
  };

  const updateLabel = (id: string, label: string) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, label } : t));
  };

  const updateTab = (id: string, tab: PublicTab | "") => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, tab: tab || undefined } : t));
  };

  const removeTemplate = (id: string) => {
    if (templates.length <= 1) { toast.error("Mantenha pelo menos um template"); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const addTemplate = () => {
    const id = `custom-${Date.now().toString(36)}`;
    setTemplates((prev) => [
      ...prev,
      {
        id,
        label: "Novo template",
        variants: {
          A: { text: "Variante A — escreva aqui.\n\n👉 {LINK}" },
          B: { text: "Variante B — escreva aqui.\n\n👉 {LINK}" },
        },
      },
    ]);
  };

  const [pendingReset, setPendingReset] = useState(false);

  const onReset = () => {
    setPendingReset(true);
  };

  const confirmReset = () => {
    setTemplates(resetABTemplates());
    toast.success("Templates restaurados");
    setPendingReset(false);
  };

  // Fetch funnel metrics from analytics_events
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
        const ids = templates.map((t) => t.id);
        const utmContents = ids.flatMap((id) => VARIANTS.map((v) => abUtmContent(id, v)));

        const { data, error } = await supabase
          .from("analytics_events")
          .select("event,utm_content,props")
          .in("event", ["link_share", "landing_with_utm"])
          .in("utm_content", utmContents)
          .gte("created_at", since)
          .limit(1000);
        if (error) throw error;

        const map = new Map<string, FunnelRow>();
        for (const id of ids) {
          for (const v of VARIANTS) {
            const key = `${id}|${v}`;
            map.set(key, { template_id: id, variant: v, shares_copy: 0, shares_open: 0, landings: 0, ctr: 0 });
          }
        }
        for (const row of (data ?? []) as Array<{ event: string; utm_content: string | null; props: Record<string, unknown> | null }>) {
          if (!row.utm_content) continue;
          const m = row.utm_content.match(/^ab-(.+)-([ab])$/);
          if (!m) continue;
          const key = `${m[1]}|${m[2].toUpperCase() as Variant}`;
          const cur = map.get(key);
          if (!cur) continue;
          if (row.event === "link_share") {
            const action = row.props?.action;
            if (action === "copy") cur.shares_copy += 1;
            else if (action === "open") cur.shares_open += 1;
          } else if (row.event === "landing_with_utm") {
            cur.landings += 1;
          }
        }
        const rows = Array.from(map.values()).map((r) => {
          const sh = r.shares_copy + r.shares_open;
          return { ...r, ctr: sh > 0 ? r.landings / sh : 0 };
        });
        if (!cancelled) setFunnel(rows);
      } catch (e) {
        if (import.meta.env.DEV) console.debug("[ABLab] funnel unavailable", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [templates, refreshTick, windowDays]);

  const winners = useMemo(() => {
    const w: Record<string, Variant | null> = {};
    for (const t of templates) {
      const a = funnel.find((r) => r.template_id === t.id && r.variant === "A");
      const b = funnel.find((r) => r.template_id === t.id && r.variant === "B");
      if (!a || !b) { w[t.id] = null; continue; }
      const aSh = a.shares_copy + a.shares_open;
      const bSh = b.shares_copy + b.shares_open;
      // require minimal sample
      if (aSh + bSh < 4) { w[t.id] = null; continue; }
      if (a.landings === b.landings) { w[t.id] = null; continue; }
      w[t.id] = a.landings > b.landings ? "A" : "B";
    }
    return w;
  }, [funnel, templates]);

  return (
    <div className="space-y-3 admin-stagger-5">
      <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
              <Beaker className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">Laboratório A/B de Textos</div>
              <p className="text-[10px] text-muted-foreground">
                Edite duas variantes por template. Cada link recebe um identificador de conteúdo da campanha distinto e o painel compara os cliques.
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setWindowDays(d as 7 | 30)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold border min-h-11 ${
                  windowDays === d ? "bg-primary/20 border-primary/40 text-primary" : "border-white/[0.08] text-muted-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setRefreshTick((t) => t + 1)} className="h-8 text-[11px] gap-1">
              <RotateCcw className="h-3 w-3" /> {loading ? "…" : "Atualizar"}
            </Button>
            <Button size="sm" variant="outline" onClick={addTemplate} className="h-8 text-[11px] gap-1">
              <Plus className="h-3 w-3" /> Novo
            </Button>
            <Button size="sm" variant="outline" onClick={onReset} className="h-8 text-[11px]">
              Restaurar
            </Button>
          </div>
        </div>
      </div>

      {templates.map((t) => {
        const linkA = buildDeepLink(siteUrl, t.tab, { short: true, content: abUtmContent(t.id, "A") });
        const linkB = buildDeepLink(siteUrl, t.tab, { short: true, content: abUtmContent(t.id, "B") });
        const rowA = funnel.find((r) => r.template_id === t.id && r.variant === "A");
        const rowB = funnel.find((r) => r.template_id === t.id && r.variant === "B");
        const winner = winners[t.id];

        return (
          <div key={t.id} className="glass-panel rounded-xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={t.label}
                onChange={(e) => updateLabel(t.id, e.target.value.slice(0, 64))}
                className="h-8 text-xs flex-1 min-w-[140px] bg-background/50 border-border/30"
              />
              <select
                value={t.tab ?? ""}
                onChange={(e) => updateTab(t.id, e.target.value as PublicTab | "")}
                className="h-8 text-xs rounded-md bg-background/50 border border-border/30 px-2 text-foreground"
                aria-label="Aba destino"
              >
                <option value="">programação</option>
                {TABS.map((tb) => <option key={tb} value={tb}>{tb}</option>)}
              </select>
              <Button size="sm" variant="ghost" onClick={() => removeTemplate(t.id)} className="h-8 px-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <VariantCard
                template={t} variant="A" link={linkA}
                onChangeText={(text) => updateVariantText(t.id, "A", text)}
                onShared={() => setRefreshTick((x) => x + 1)}
              />
              <VariantCard
                template={t} variant="B" link={linkB}
                onChangeText={(text) => updateVariantText(t.id, "B", text)}
                onShared={() => setRefreshTick((x) => x + 1)}
              />
            </div>

            {/* Funnel */}
            <div className="rounded-lg border border-white/[0.06] bg-background/30 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Métricas dos últimos {windowDays} dias
                </span>
                {winner && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                    <Trophy className="h-3 w-3" /> Variante {winner} lidera
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VARIANTS.map((v) => {
                  const r = v === "A" ? rowA : rowB;
                  const total = (r?.shares_copy ?? 0) + (r?.shares_open ?? 0);
                  const ctr = r?.ctr ?? 0;
                  const isWin = winner === v;
                  return (
                    <div key={v} className={`rounded-md p-2 space-y-1 border ${isWin ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/[0.06] bg-background/40"}`}>
                      <div className="text-[10px] font-bold text-foreground">Variante {v}</div>
                      <div className="grid grid-cols-2 gap-1">
                        <FunnelStat label="Envios" value={total} />
                        <FunnelStat label="Aterriss." value={r?.landings ?? 0} accent={isWin} />
                        <FunnelStat label="Copy" value={r?.shares_copy ?? 0} />
                        <FunnelStat label="Open" value={r?.shares_open ?? 0} />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Taxa de clique (CTR): <span className="text-foreground font-bold">{(ctr * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!loading && (rowA?.shares_copy ?? 0) + (rowA?.shares_open ?? 0) + (rowB?.shares_copy ?? 0) + (rowB?.shares_open ?? 0) === 0 && (
                <p className="text-[10px] text-muted-foreground/70 italic">
                  Nenhum envio rastreado ainda. Compartilhe as variantes para começar a coletar dados.
                </p>
              )}
            </div>
          </div>
        );
      })}

      <AlertDialog open={pendingReset} onOpenChange={(o) => !o && setPendingReset(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar templates padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              Suas edições atuais serão perdidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ABTemplateLab;
