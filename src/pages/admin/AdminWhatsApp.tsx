import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAllDailyGames, type DailyGame } from "@/hooks/useDailyGames";
import { useSiteUrl } from "@/hooks/useSiteUrl";
import { useLiveTick } from "@/hooks/useLiveTick";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Copy, Check, MessageCircle, Link2, FileText, AlertTriangle,
  CheckCircle2, Tv, ChevronDown, ChevronUp, Calendar, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getLocalDateString, midnightInSaoPaulo } from "@/lib/gameUtils";
import { buildDeepLink, TAB_SLUGS, type PublicTab } from "@/lib/utils";
import { trackShare, type ShareProps } from "@/lib/analytics";
import { validateDay, safeCopy, offsetDateStr } from "@/lib/whatsappText";
import { ABTemplateLab } from "@/components/admin/whatsapp/ABTemplateLab";
import { ShareHistory } from "@/components/admin/whatsapp/ShareHistory";
import { FormatComposer, openWhatsApp } from "@/components/admin/whatsapp/FormatComposer";
import { useShareLandingCounts } from "@/hooks/useShareLandingCounts";

type DeepTab = PublicTab;

const DRAFT_KEY = "admin:wppDraft";

const handleCopy = async (text: string, onAfterCopy?: () => void) => {
  const ok = await safeCopy(text);
  if (ok) {
    toast.success("Copiado!");
    onAfterCopy?.();
  } else {
    toast.error("Não foi possível copiar. Selecione e copie manualmente.");
  }
};

const CopyButton = ({ text, label, onAfterCopy, className }: { text: string; label: string; onAfterCopy?: () => void; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    await handleCopy(text, () => {
      setCopied(true);
      onAfterCopy?.();
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button size="sm" variant="outline" onClick={onClick} className={`flex-1 gap-1.5 text-xs min-h-[44px] ${className ?? ""}`}>
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label}
    </Button>
  );
};


const MessageCard = ({ template, siteUrl, accessCount }: { template: { id: string; label: string; text: string; tab?: DeepTab }; siteUrl: string; accessCount?: number }) => {
  const link = buildDeepLink(siteUrl, template.tab, { short: true, content: `tpl-${template.id}` });
  const finalText = template.text.replace("LINK_PLACEHOLDER", link);

  const shareMeta: ShareProps = {
    surface: "admin-whatsapp-template",
    tab: template.tab ?? null,
    utm_campaign: template.tab ? `share-${TAB_SLUGS[template.tab]}` : null,
    utm_content: `tpl-${template.id}`,
    action: "open",
  };

  return (
    <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold text-foreground">{template.label}</span>
        <div className="flex items-center gap-1.5">
          {typeof accessCount === "number" && accessCount > 0 && (
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5">
              {accessCount} acesso{accessCount === 1 ? "" : "s"}
            </span>
          )}
          {template.tab && (
            <span className="text-[9px] text-muted-foreground/70 bg-background/50 rounded px-1.5 py-0.5">
              Abre: {template.tab === "schedule" ? "Programação" : "Filmes e Séries"}
            </span>
          )}
        </div>
      </div>
      <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed bg-background/50 rounded-lg p-3 max-h-[140px] overflow-y-auto">
        {finalText}
      </pre>
      <div className="flex gap-2">
        <CopyButton text={finalText} label="Copiar" onAfterCopy={() => trackShare({ ...shareMeta, action: "copy" })} />
        <Button size="sm" onClick={() => openWhatsApp(finalText, shareMeta)} className="flex-1 gap-1.5 text-xs bg-[hsl(142,70%,38%)] hover:bg-[hsl(142,70%,32%)] text-white min-h-[44px]">
          <MessageCircle className="h-3.5 w-3.5" />
          Enviar
        </Button>
      </div>
    </div>
  );
};

const ProblemList = ({ items, label, onJump }: { items: DailyGame[]; label: string; onJump: () => void }) => {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1">
      <p className="text-[11px] font-bold text-amber-200">{label} ({items.length})</p>
      <ul className="text-[10px] text-muted-foreground space-y-0.5">
        {items.slice(0, 8).map((g) => (
          <li key={g.id} className="truncate">
            {g.game_time?.slice(0, 5)} — {g.home_team}{g.away_team ? ` x ${g.away_team}` : ""}
          </li>
        ))}
        {items.length > 8 && <li className="italic opacity-60">+{items.length - 8} mais…</li>}
      </ul>
      <button
        type="button"
        onClick={onJump}
        className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 min-h-11 px-1 -mx-1"
      >
        <ExternalLink className="h-3 w-3" /> Abrir Programação
      </button>
    </div>
  );
};

/** Resumo de saúde da programação do dia (sem canal / 00:00 / duplicados). */
const ValidationStrip = ({
  title, dateStr, validation, onJumpToSchedule, lastUpdatedAt,
}: {
  title: string;
  dateStr: string;
  validation: ReturnType<typeof validateDay>;
  onJumpToSchedule: () => void;
  lastUpdatedAt: number;
}) => {
  const [, m, d] = dateStr.split("-");
  const hasIssues = validation.noChannel > 0 || validation.zeroTime > 0 || validation.duplicates > 0;
  const allOk = validation.active > 0 && !hasIssues;
  const [showProblems, setShowProblems] = useState(false);
  useLiveTick(); // re-render to update "atualizado há"

  const ageSec = lastUpdatedAt > 0 ? Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000)) : null;
  const ageLabel =
    ageSec === null ? "carregando…" :
    ageSec < 60 ? `há ${ageSec}s` :
    ageSec < 3600 ? `há ${Math.floor(ageSec / 60)}min` :
    `há ${Math.floor(ageSec / 3600)}h`;

  return (
    <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-[10px] text-muted-foreground">
            {d}/{m} · {ageSec === null ? "carregando jogos…" : `${validation.active} jogo(s) publicado(s)`} · {ageSec === null ? ageLabel : `atualizado ${ageLabel}`}
          </p>
        </div>
        {validation.active > 0 && (
          allOk
            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Sem problemas" />
            : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" aria-label="Verificar avisos" />
        )}
      </div>

      {validation.active === 0 && ageSec !== null && (
        <p className="text-[11px] text-amber-200 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Nenhuma programação publicada nesta data.
          <button type="button" onClick={onJumpToSchedule} className="text-primary hover:underline inline-flex items-center gap-1 min-h-11">
            <ExternalLink className="h-3 w-3" /> Abrir Programação
          </button>
        </p>
      )}

      {validation.active > 0 && (
        <div className="flex gap-1.5 text-[10px] overflow-x-auto scrollbar-none -mx-1 px-1">
          {validation.noChannel > 0 && (
            <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 whitespace-nowrap">
              <Tv className="inline h-3 w-3 mr-1" />{validation.noChannel} sem canal
            </span>
          )}
          {validation.zeroTime > 0 && (
            <span className="px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200 whitespace-nowrap">
              {validation.zeroTime} com 00:00
            </span>
          )}
          {validation.duplicates > 0 && (
            <span className="px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200 whitespace-nowrap">
              {validation.duplicates} duplicado(s)
            </span>
          )}
          {allOk && (
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 whitespace-nowrap">
              Tudo certo
            </span>
          )}
        </div>
      )}

      {hasIssues && (
        <button
          type="button"
          onClick={() => setShowProblems((v) => !v)}
          className="text-[11px] text-amber-300 hover:underline inline-flex items-center gap-1 min-h-11 self-start"
        >
          {showProblems ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showProblems ? "Ocultar problemas" : "Ver problemas"}
        </button>
      )}

      {showProblems && (
        <div className="space-y-2">
          <ProblemList items={validation.problems.noChannel} label="Sem canal" onJump={onJumpToSchedule} />
          <ProblemList items={validation.problems.zeroTime} label="Horário 00:00" onJump={onJumpToSchedule} />
          <ProblemList items={validation.problems.duplicates} label="Duplicados" onJump={onJumpToSchedule} />
        </div>
      )}
    </div>
  );
};

const AdminWhatsApp = () => {
  const navigate = useNavigate();
  useLiveTick(); // re-render header date after midnight

  // Recalculado a cada tick (useLiveTick) para acompanhar a virada da meia-noite em São Paulo.
  const todayStr = getLocalDateString(new Date());
  const tomorrowStr = useMemo(() => offsetDateStr(todayStr, 1), [todayStr]);
  const dayAfterStr = useMemo(() => offsetDateStr(todayStr, 2), [todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  // Se o dia virou enquanto a aba estava aberta e o admin estava em "Hoje", acompanha o novo dia.
  const prevTodayRef = useRef(todayStr);
  useEffect(() => {
    if (prevTodayRef.current !== todayStr) {
      if (selectedDate === prevTodayRef.current) setSelectedDate(todayStr);
      prevTodayRef.current = todayStr;
    }
  }, [todayStr, selectedDate]);

  const dayLabel = useMemo(() => {
    if (selectedDate === todayStr) return "Hoje";
    if (selectedDate === tomorrowStr) return "Amanhã";
    if (selectedDate === dayAfterStr) return format(midnightInSaoPaulo(selectedDate), "EEEE", { locale: ptBR });
    return format(midnightInSaoPaulo(selectedDate), "EEEE, dd/MM", { locale: ptBR });
  }, [selectedDate, todayStr, tomorrowStr, dayAfterStr]);

  const { data: dayGames, dataUpdatedAt, isLoading: gamesLoading } = useAllDailyGames(selectedDate);
  const siteUrl = useSiteUrl();
  const [linkTab, setLinkTab] = useState<DeepTab>("schedule");
  const [customMsg, setCustomMsg] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(DRAFT_KEY) ?? "";
  });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, customMsg); } catch { /* ignore */ }
  }, [customMsg]);

  const dayValidation = useMemo(() => validateDay(dayGames ?? []), [dayGames]);

  const customLink = buildDeepLink(siteUrl, linkTab, { short: true, content: `custom-${linkTab}` });
  const customFinal = customMsg.trim()
    ? customMsg.includes("{LINK}")
      ? customMsg.replace(/\{LINK\}/g, customLink).trim()
      : `${customMsg.trim()}\n\n👉 ${customLink}`
    : "";
  const charCount = customFinal.length;

  const fDate = format(new Date(), "dd/MM/yyyy");
  const dName = format(new Date(), "EEEE", { locale: ptBR });
  const templates = useMemo(() => ([
    { id: "geral", label: "📺 Geral do Dia",
      text: `📺 *Programação do Dia*\n\n📅 ${dName}, ${fDate}\n\nConfira os jogos, novidades e indicações de hoje no portal da Brito Solutions.\n\n👉 LINK_PLACEHOLDER` },
    { id: "jogos", label: "⚽ Jogos", tab: "schedule" as DeepTab,
      text: `⚽ *Jogos de Hoje Atualizados*\n\n📅 ${fDate}\n\nVeja horários, canais e destaques do dia.\n\n👉 LINK_PLACEHOLDER` },
    { id: "entretenimento", label: "🍿 Entretenimento", tab: "novidades" as DeepTab,
      text: `🍿 *Assista Hoje*\n\nFilmes, séries, novidades e lançamentos do dia em um só lugar.\n\n👉 LINK_PLACEHOLDER` },
    { id: "aovivo", label: "🔴 Ao Vivo", tab: "schedule" as DeepTab,
      text: `🔴 *Ao Vivo Agora*\n\nVeja os jogos que estão rolando neste momento.\n\n👉 LINK_PLACEHOLDER` },
    { id: "novidades", label: "🆕 Novidades", tab: "novidades" as DeepTab,
      text: `🆕 *Novidades da Semana*\n\nFilmes, séries e lançamentos recém-adicionados.\n\n👉 LINK_PLACEHOLDER` },
  ]), [dName, fDate]);

  const dayChips: { value: string; label: string }[] = [
    { value: todayStr, label: "Hoje" },
    { value: tomorrowStr, label: "Amanhã" },
    { value: dayAfterStr, label: "+2 dias" },
  ];

  // Access counts (last 7d) for quick links + templates
  const trackedContents = useMemo(() => [
    "quick-live", "quick-novidades", "quick-schedule",
    ...templates.map((t) => `tpl-${t.id}`),
  ], [templates]);
  const { counts: landingCounts } = useShareLandingCounts(trackedContents, 7);

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && customMsg.trim()) {
      openWhatsApp(customFinal, { surface: "admin-whatsapp-custom", tab: linkTab, utm_content: `custom-${linkTab}`, action: "open" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-4 sm:p-5 admin-stagger-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">WhatsApp — Compartilhamento</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pré-visualize, valide e compartilhe a programação manual.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Link */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-3 admin-stagger-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Link do Site</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-muted-foreground bg-background/50 rounded-lg px-3 py-2.5 truncate">{siteUrl}</code>
          <CopyButton text={siteUrl} label="Copiar" className="!flex-none w-auto px-3" />
        </div>
      </div>

      {/* Quick Tab Links */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-3 admin-stagger-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground truncate">Links rápidos por aba</span>
          </div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0" title="Links curtos /s/<aba> com rastreio embutido">
            ● rastreado
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {([
            { tab: "schedule" as DeepTab, label: "Programação", emoji: "📅", msg: "📅 Programação completa de hoje no portal 👇" },
            { tab: "novidades" as DeepTab, label: "Filmes e Séries", emoji: "🎬", msg: "🎬 Filmes e séries da semana — confira os lançamentos 👇" },
          ]).map(({ tab, label, emoji, msg }) => {
            const content = `quick-${tab}`;
            const link = buildDeepLink(siteUrl, tab, { short: true, content });
            const text = `${msg}\n\n${link}`;
            const accesses = landingCounts[content] ?? 0;
            return (
              <div key={tab} className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/40 px-2.5 py-2 flex-wrap sm:flex-nowrap">
                <span className="text-sm font-bold text-foreground truncate flex-1 min-w-0" title={link}>
                  <span aria-hidden>{emoji}</span> {label}
                </span>
                {accesses > 0 && (
                  <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 shrink-0">
                    {accesses} acesso{accesses === 1 ? "" : "s"}
                  </span>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <CopyButton
                    text={link}
                    label="Copiar"
                    onAfterCopy={() => trackShare({ surface: "admin-whatsapp-quick", tab, utm_campaign: `share-${TAB_SLUGS[tab]}`, utm_content: content, action: "copy" })}
                  />
                  <Button
                    size="sm"
                    onClick={() => openWhatsApp(text, { surface: "admin-whatsapp-quick", tab, utm_campaign: `share-${TAB_SLUGS[tab]}`, utm_content: content, action: "open" })}
                    className="gap-1.5 text-xs bg-[hsl(142,70%,38%)] hover:bg-[hsl(142,70%,32%)] text-white min-h-[44px] px-3"
                    aria-label={`Enviar ${label} no WhatsApp`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Enviar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Selector + Preview */}
      <div className="space-y-3 admin-stagger-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {dayChips.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedDate(c.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors min-h-11 ${
                  selectedDate === c.value
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.18]"
                }`}
              >
                {c.label}
              </button>
            ))}
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 text-xs w-[150px] glass-panel border-white/[0.08]"
              aria-label="Escolher data"
            />
          </div>
        </div>
        <ValidationStrip
          title={`${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}`}
          dateStr={selectedDate}
          validation={dayValidation}
          onJumpToSchedule={() => navigate("/admin/programacao")}
          lastUpdatedAt={dataUpdatedAt}
        />
        <FormatComposer
          games={dayGames}
          gamesLoading={gamesLoading}
          dateStr={selectedDate}
          todayStr={todayStr}
          siteUrl={siteUrl}
        />
      </div>

      {/* Custom Message */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-3 admin-stagger-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Mensagem Personalizada</span>
          </div>
          <div className="flex gap-1">
            {(["schedule", "novidades"] as DeepTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLinkTab(t)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors min-h-11 ${
                  linkTab === t
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "border-white/[0.08] text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={linkTab === t}
              >
                {t === "schedule" ? "Link: Programação" : "Link: Filmes e Séries"}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          placeholder={"Digite sua mensagem… use {LINK} para inserir o link onde quiser, ou ele será adicionado no fim."}
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value.slice(0, 4096))}
          onKeyDown={handleCustomKeyDown}
          maxLength={4096}
          className="text-xs min-h-[80px] bg-background/50 border-border/30"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-[10px] ${charCount > 1024 ? "text-destructive" : "text-muted-foreground/50"}`}>
            {charCount > 0 ? `${charCount} caracteres` : ""}
            {customMsg.includes("{LINK}") ? " · {LINK} ativo" : ""}
          </span>
          {charCount > 1024 && (
            <span className="text-[10px] text-destructive">Preview do WhatsApp pode ser cortado</span>
          )}
          <span className="text-[10px] text-muted-foreground/60">⌘/Ctrl+Enter envia</span>
        </div>
        {customFinal && (
          <pre className="text-[10px] text-muted-foreground/70 whitespace-pre-wrap bg-background/30 rounded-lg p-2 max-h-[120px] overflow-y-auto">
            {customFinal}
          </pre>
        )}
        <div className="flex gap-2">
          <CopyButton
            text={customFinal || siteUrl}
            label="Copiar"
            onAfterCopy={() => trackShare({ surface: "admin-whatsapp-custom", tab: linkTab, utm_content: `custom-${linkTab}`, action: "copy" })}
          />
          <Button
            size="sm"
            disabled={!customMsg.trim()}
            onClick={() => openWhatsApp(customFinal, { surface: "admin-whatsapp-custom", tab: linkTab, utm_content: `custom-${linkTab}`, action: "open" })}
            className="flex-1 gap-1.5 text-xs bg-[hsl(142,70%,38%)] hover:bg-[hsl(142,70%,32%)] text-white min-h-[44px]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Pre-built Templates */}
      <div className="admin-stagger-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Copy className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Textos Prontos</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <MessageCard key={t.id} template={t} siteUrl={siteUrl} accessCount={landingCounts[`tpl-${t.id}`] ?? 0} />
          ))}
      </div>

      {/* A/B Template Lab */}
      <ABTemplateLab />

      {/* Histórico de envios */}
      <ShareHistory />
    </div>
    </div>
  );
};

export default AdminWhatsApp;
