import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAllBanners, useCreateBanner, useUpdateBanner, useDeleteBanner, CATEGORY_LABELS, CATEGORY_LIST, type Banner, type BannerCategory } from "@/hooks/useBanners";
import { ProgramacaoTexto } from "@/components/admin/ProgramacaoTexto";
import { ScheduleVersionHistory } from "@/components/admin/ScheduleVersionHistory";
import { DailyGamesManager } from "@/components/admin/DailyGamesManager";
import { ArchivedGamesManager } from "@/components/admin/ArchivedGamesManager";
import { ExpiredBannersAlert } from "@/components/admin/ExpiredBannersAlert";
import { BannerCard } from "@/components/admin/BannerCard";
import { BannerHealthPanel } from "@/components/admin/BannerHealthPanel";
import { BannerPreviewModal } from "@/components/admin/BannerPreviewModal";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Loader2, Image as ImageIcon, ClipboardPaste, Clock, PowerOff, AlertCircle, Search, X, Power, Trash2, Copy, Sparkles } from "lucide-react";
import { getScheduleDate, isFutureSchedule } from "@/lib/dateUtils";
import { useLiveTick } from "@/hooks/useLiveTick";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Keyword hints (file name) → banner category */
const CATEGORY_HINTS: [RegExp, BannerCategory][] = [
  [/futsal|lnf|cbfs/i, "futsal"],
  [/futebol|brasileirao|brasileirão|libertadores|champions|premier|laliga|serie[-_ ]?a/i, "football"],
  [/basquete|basket|nba|nbb/i, "basketball"],
  [/volei|vôlei|volley|superliga/i, "volleyball"],
  [/handebol|handball/i, "handball"],
  [/tenis|tênis|atp|wta|wimbledon|roland/i, "tennis"],
  [/f1|formula|fórmula|motogp|stockcar|stock[-_ ]?car|nascar|automobilismo|indy/i, "motorsport"],
  [/ufc|mma/i, "ufc"],
  [/boxe|boxing/i, "boxing"],
  [/atletismo|athletics|maratona|diamond/i, "athletics"],
  [/natacao|natação|swimming/i, "swimming"],
  [/ciclismo|cycling|tour/i, "cycling"],
  [/surf|wsl/i, "surf"],
  [/golf/i, "golf"],
  [/hoquei|hóquei|hockey|nhl/i, "hockey"],
  [/baseball|beisebol|mlb/i, "baseball"],
  [/rugby/i, "rugby"],
  [/esport|cblol|valorant|cs2|csgo|lol/i, "esports"],
  [/guia/i, "football_guide"],
  [/capa|cover|destaque/i, "cover"],
];

/** Returns a category when every hinted file name agrees, otherwise null */
function suggestCategoryFromNames(names: string[]): BannerCategory | null {
  const hits = new Set<BannerCategory>();
  for (const n of names) {
    for (const [re, cat] of CATEGORY_HINTS) {
      if (re.test(n)) { hits.add(cat); break; }
    }
  }
  return hits.size === 1 ? [...hits][0] : null;
}


const BANNER_PROMPT_MODEL = `Você é um EXTRATOR de programação esportiva. A partir da IMAGEM enviada, identifique TODOS os eventos visíveis (jogos, treinos, classificações, sprints, corridas, lutas, rodadas) e devolva SOMENTE o texto formatado abaixo — sem explicações, sem markdown, sem aspas.

═══════════════════════════════════════════
FORMATO OBRIGATÓRIO — siga ao pé da letra
═══════════════════════════════════════════

TÍTULO: <até 60 caracteres, com emoji do esporte principal no início>

📅 Dia DD/MM

<linha 1 do evento>
<emoji do esporte> <Competição (Sessão/Fase)> / ⏰ HHhMM / #esporte
📺 <Canal1, Canal2>

<linha em branco>

<próximo evento...>

⚠️ CADA EVENTO OCUPA EXATAMENTE 3 LINHAS + 1 LINHA EM BRANCO. NUNCA junte tudo numa única linha. Quebre as linhas de verdade (Enter), mesmo que a imagem da programação esteja em formato compacto.

═══════════════════════════════════════════
TAG DE ESPORTE (#esporte) — OBRIGATÓRIA
═══════════════════════════════════════════

A linha 2 SEMPRE termina com " / #esporte". A tag é o que define o esporte no sistema — o emoji é só decoração. Use EXATAMENTE uma destas:

#futebol #futsal #basquete #volei #handebol #tenis
#f1 #motogp #stockcar #formulae #indycar #nascar #motocross
#mma #boxe #baseball #rugby #hoquei
#surfe #ciclismo #golfe #natacao #atletismo #ginastica #esports

Como escolher a tag:
• Olhe o ÍCONE/COR da coluna de competição da tabela, NÃO o nome da competição.
• Bola de vôlei em "Copa Sul-Americ. Masc" → #volei (NÃO #futebol).
• "Nascar O'Reilly", "Stock Car", "Turismo Nacional", "Bagger World Cup", "MotoGP" → automobilismo (#nascar, #stockcar, #turismo→#stockcar, #motogp).
• Luva 🥊: use #mma só em UFC/Bellator/PFL/ONE; qualquer outro card de luta → #boxe.
• "LNF", "CBFS", "Brasileiro de Futsal" → #futsal (nunca #futebol).
• Se ficar em dúvida entre dois esportes, use o ícone da tabela como desempate final.
• PROIBIDO usar 🏆 como emoji de esporte — use sempre o emoji específico.


═══════════════════════════════════════════
TIPOS DE LINHA 1 (escolha UM por evento)
═══════════════════════════════════════════

▶ FORMATO A — confronto entre dois adversários (futebol, basquete, vôlei, baseball, rugby, hóquei, futsal):
   Time A x Time B
   (use "x" minúsculo. Times femininos recebem "(F)" depois do nome.)

▶ FORMATO B — eventos individuais ou de etapa (F1, MotoGP, Stock Car, Fórmula E, IndyCar, Tênis, Golfe, Boxe, MMA, Surfe, Ciclismo, Natação, Atletismo):
   Nome do Evento — Sessão/Fase
   (NUNCA use "x ?" / "x TBD" / "x A definir". Se não há adversário, use FORMATO B.)
   Para Boxe/MMA com confronto nominado, use FORMATO A: "Lutador A x Lutador B".

═══════════════════════════════════════════
REGRAS CRÍTICAS
═══════════════════════════════════════════

1. UMA ÚNICA data por bloco 📅. Se o dia 19/06 tem futebol, MotoGP, tênis e boxe, TUDO entra debaixo de UM único "📅 Dia 19/06". Nunca repita o mesmo dia em dois blocos.

2. Dentro de cada bloco 📅, ordene TODOS os eventos por horário crescente (HHhMM), independente do esporte.

3. Horário SEMPRE no padrão HHhMM (16h00, 04h45, 22h30). NUNCA "16:00".

4. SESSÃO/FASE entre parênteses é OBRIGATÓRIA quando o esporte tem múltiplas sessões no mesmo dia:
   • F1/MotoGP/Moto2/Moto3/Stock Car/Fórmula E/IndyCar: (Treino Livre 1), (Treino Livre 2), (Treino Livre 3), (Classificação), (Sprint Shootout), (Sprint), (Corrida), (Warm Up)
   • Tênis: (1ª Rodada), (2ª Rodada), (Oitavas), (Quartas), (Semifinal), (Final)
   • Golfe: (1ª Rodada), (2ª Rodada), (3ª Rodada), (Rodada Final)
   • Boxe/MMA: (Card Preliminar), (Card Principal), (Luta Principal)
   • Futebol/copas: (Fase de Grupos), (Oitavas), (Quartas), (Semifinal), (Final)

5. ANTI-REDUNDÂNCIA: o que está na linha 1 NÃO se repete na linha do 🏆.
   ✅ CORRETO:
      MotoGP — GP da Chéquia (Classificação)
      🏎️ MotoGP / ⏰ 09h00
   ❌ ERRADO:
      MotoGP — GP da Chéquia (Classificação)
      🏎️ Grande Prêmio da Chéquia / ⏰ 09h00

6. NÃO DUPLIQUE eventos. Mesmo evento + mesma sessão + mesmo horário só aparece UMA vez. Se aparecer duas vezes na imagem (canais diferentes), junte os canais com vírgula.

7. Se uma seção/esporte não tem nenhum evento, OMITA. NUNCA escreva "Nenhum jogo identificado", "Sem eventos hoje", "—".

8. NÃO filtre por relevância. Liste TUDO o que está visível: treinos livres, classificações, jogos secundários, ligas regionais, eventos noturnos.

9. Múltiplos canais: separe por vírgula com espaço. Ex: "ESPN 4, Disney+, Cazé TV".

10. NÃO adicione introdução, rodapé, totalizadores, comentários.

11. CÉLULA COM VÁRIOS CONFRONTOS → VÁRIOS EVENTOS. Se uma linha da tabela traz
   "Santo André x Jaraguá, Campo Mourão x Cascavel, Tubarão x ACBF", gere UM bloco de
   3 linhas para CADA confronto, repetindo horário, competição e canais.

12. HORÁRIO EMBUTIDO NA CÉLULA. Em "Barcelona x Nottingham F., 17h00 Udinese x Barcelona",
   o segundo confronto é um evento próprio com horário 17h00.

13. PREFIXO DE FASE VAI PARA OS PARÊNTESES DA LINHA 2, nunca fica na linha 1:
   • "QF (ida) - São José-RS x Gama" → linha 1 "São José-RS x Gama", linha 2 "(Quartas — Ida)"
   • "SF - Brasil x ARG ou CHI" → "(Semifinal)"   • "OF - Lehecka x Jodar" → "(Oitavas)"
   • "classificação" → "(Classificação)"   • "corrida 1" → "(Corrida 1)"   • "sprint" → "(Sprint)"
   • "card preliminar" → "(Card Preliminar)"

14. FEMININO: "Atlético-MG F" → "Atlético-MG (F)". Se a tabela indicar competição feminina,
   inclua "Feminino" no nome da competição.

15. CANAIS: "youtube Canal GOAT" → "YouTube Canal GOAT"; "SPORTV-PREMIERE" → "SporTV, Premiere".
   Mantenha parênteses regionais como estão: "BAND (N, NE, int. SP)".

═══════════════════════════════════════════
REGRA DO TÍTULO (1ª linha)
═══════════════════════════════════════════

• Se o dia tem 1 evento dominante (ex: só Copa do Mundo): use esse evento.
   Ex: "⚽ Copa do Mundo — Oitavas de Final"
• Se o dia tem múltiplos esportes relevantes: use formato genérico.
   Ex: "🗓️ Programação Esportiva — 19/06"
• ≤60 caracteres, sempre começa com 1 emoji.

═══════════════════════════════════════════
EMOJIS POR ESPORTE (use no início da linha 2)
═══════════════════════════════════════════
⚽ Futebol   🥅 Futsal   🏀 Basquete   🏐 Vôlei
🤾 Handebol   🎾 Tênis   🏎️ F1/MotoGP/Stock/F-E/IndyCar/NASCAR
🥊 MMA/Boxe   ⚾ Baseball   🏉 Rugby
🏒 Hóquei   🏄 Surfe   🚴 Ciclismo
⛳ Golfe   🏊 Natação   🏃 Atletismo   🤸 Ginástica   🎮 eSports

⚠️ O HORÁRIO NUNCA VAI NA LINHA 1. A linha 1 é só o nome do evento/confronto.
⚠️ A linha 2 (<emoji> Competição / ⏰ HHhMM / #esporte) é OBRIGATÓRIA em TODO evento,
   inclusive em evento único. Se não houver competição nomeada, repita o nome do esporte:
   ✅ CORRETO:
      Camp. Mundial Sub-20 — Dia 4
      🏃 Atletismo / ⏰ 13h00 / #atletismo
      📺 SporTV 3
   ❌ ERRADO (horário na linha 1, sem linha de competição, sem tag):
      Atletismo / 13h00
      📺 SporTV 3


═══════════════════════════════════════════
EXEMPLO DE SAÍDA VÁLIDA (dia multi-esporte)
═══════════════════════════════════════════
TÍTULO: 🗓️ Programação Esportiva — 08/08

📅 Dia 08/08

MotoGP — GP da Grã-Bretanha (Classificação)
🏎️ MotoGP / ⏰ 07h50 / #motogp
📺 ESPN 4

Lehecka x Jodar
🎾 Masters 1000 Montreal (Oitavas) / ⏰ 13h00 / #tenis
📺 SporTV 2

Camp. Mundial Sub-20 — Dia 4
🏃 Atletismo / ⏰ 13h00 / #atletismo
📺 SporTV 3

São José-RS x Gama
⚽ Série D (Quartas — Ida) / ⏰ 17h00 / #futebol
📺 YouTube Canal GOAT

Santo André x Jaraguá
🥅 LNF Futsal / ⏰ 19h00 / #futsal
📺 SporTV

Brasil x ARG ou CHI
🏐 Copa Sul-Americana Masc. (Semifinal) / ⏰ 21h30 / #volei
📺 SporTV 2

Mateusz Gamrot x Quillan Salkilld
🥊 UFC Fight Night (Luta Principal) / ⏰ 21h00 / #mma
📺 UFC Fight Pass

═══════════════════════════════════════════
CHECKLIST FINAL — antes de responder, confira:
═══════════════════════════════════════════
[ ] Cada evento tem EXATAMENTE 3 linhas + 1 linha em branco
[ ] TODA linha 2 termina com " / #esporte" de tag válida
[ ] Nenhum 🏆 usado como emoji de esporte
[ ] Célula com vírgulas foi expandida em vários eventos
[ ] Prefixo de fase (QF/SF/OF/classificação) movido para os parênteses da linha 2
[ ] Apenas 1 bloco 📅 por data
[ ] Eventos ordenados por horário crescente
[ ] Nenhum evento duplicado
[ ] Linha 2 não repete o nome do evento da linha 1
[ ] Nenhuma linha tem "x ?" ou "x TBD"
[ ] Horários no formato HHhMM
[ ] Nenhum texto extra (intro/rodapé/comentário)

Agora processe a imagem e devolva APENAS o texto formatado.`;


const validateImageFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) return `${file.name}: não é imagem`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: maior que 5MB`;
  return null;
};

type StatusFilter = "all" | "active" | "scheduled" | "inactive" | "expired";

const PasteZone = ({
  onFiles, uploading,
}: { onFiles: (files: File[]) => void; uploading: boolean }) => {
  const [highlight, setHighlight] = useState(false);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) { e.preventDefault(); onFiles(files); }
  }, [onFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setHighlight(true); }, []);
  const handleDragLeave = useCallback(() => setHighlight(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setHighlight(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFocus={() => setHighlight(true)}
      onBlur={() => setHighlight(false)}
      tabIndex={0}
      role="button"
      aria-label="Cole (Ctrl+V) ou arraste imagens aqui para enviar"
      aria-busy={uploading}
      className={`relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        highlight ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/50 bg-transparent"
      } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex flex-col items-center gap-1.5">
        {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <ClipboardPaste className="h-5 w-5 text-muted-foreground/50" />}
        <span className="text-[11px] text-muted-foreground/70">
          {uploading ? "Enviando..." : "Cole (Ctrl+V) ou arraste imagens aqui — várias permitidas"}
        </span>
      </div>
    </div>
  );
};

type Section = "categories" | "programacao";

const AdminProgramacao = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Section = tabParam === "categories" ? "categories" : "programacao";
  const [activeSection, setActiveSection] = useState<Section>(initialTab);

  const [selectedCategory, setSelectedCategory] = useState<BannerCategory>("cover");
  const { data: banners, isLoading } = useAllBanners(selectedCategory);
  const { data: allBanners } = useAllBanners();
  const countsByCategory = useMemo(() => {
    const out: Partial<Record<BannerCategory, number>> = {};
    for (const b of allBanners ?? []) out[b.category] = (out[b.category] ?? 0) + 1;
    return out;
  }, [allBanners]);

  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"none" | "00" | "06" | "12" | "custom">("00");
  const [scheduleDate, setScheduleDate] = useState(() => getScheduleDate(0));
  const [defaultExpires, setDefaultExpires] = useState<string>("");
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringRepeats, setRecurringRepeats] = useState(2);
  const [recurringIntervalDays, setRecurringIntervalDays] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | "delete" | "deactivate" | "activate">(null);

  useLiveTick();

  // Clear multi-select whenever the visible list changes (filters/search/tab)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedCategory, statusFilter, search, activeSection]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSetSection = useCallback((section: Section) => {
    setActiveSection(section);
    setSearchParams(section === "programacao" ? {} : { tab: section });
  }, [setSearchParams]);

  const minDatetime = getScheduleDate(0).slice(0, 16);
  const scheduleInvalid = scheduleMode !== "none" && !isFutureSchedule(scheduleDate);

  const uploadMany = useCallback(async (files: File[]) => {
    if (!files.length) return;
    if (scheduleInvalid) { toast.error("Data de agendamento inválida (use uma data futura)"); return; }

    const valid: File[] = [];
    const errors: string[] = [];
    for (const f of files) {
      const err = validateImageFile(f);
      if (err) errors.push(err); else valid.push(f);
    }
    if (errors.length) toast.error(`${errors.length} arquivo(s) ignorado(s)`, { description: errors.slice(0, 3).join("; ") });
    if (!valid.length) return;

    // Suggest a better category based on the file names
    const suggested = suggestCategoryFromNames(valid.map((f) => f.name || ""));
    if (suggested && suggested !== selectedCategory) {
      toast.info(`Estes arquivos parecem ser de ${CATEGORY_LABELS[suggested]}`, {
        description: `Enviando para ${CATEGORY_LABELS[selectedCategory]}. Toque para mudar de categoria antes do próximo envio.`,
        action: { label: "Mudar", onClick: () => setSelectedCategory(suggested) },
      });
    }


    setUploading(true);
    setProgress({ current: 0, total: valid.length });

    let baseOrder = 0;
    try {
      const { data: maxRow } = await supabase
        .from("banners").select("sort_order")
        .eq("category", selectedCategory)
        .order("sort_order", { ascending: false })
        .limit(1).maybeSingle();
      baseOrder = maxRow?.sort_order ?? 0;
    } catch {
      baseOrder = banners?.reduce((m, b) => Math.max(m, b.sort_order), 0) || 0;
    }

    // Recurring schedule expansion: each file becomes N entries with publish_at staggered.
    const repeats = recurringEnabled && scheduleMode !== "none" ? Math.max(1, Math.min(12, recurringRepeats)) : 1;
    const intervalMs = Math.max(1, Math.min(30, recurringIntervalDays)) * 24 * 60 * 60 * 1000;
    const totalOps = valid.length * repeats;
    setProgress({ current: 0, total: totalOps });

    let okCount = 0, failCount = 0, opIdx = 0;
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      try {
        const ext = file.name?.split(".").pop()?.toLowerCase() || "png";
        const today = new Date().toISOString().split("T")[0];
        const path = `${selectedCategory}/${today}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("banners").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);

        const baseDate = scheduleMode !== "none" && scheduleDate ? new Date(scheduleDate) : null;
        for (let r = 0; r < repeats; r++) {
          baseOrder += 1;
          const bannerData: Parameters<typeof createBanner.mutateAsync>[0] = {
            image_url: publicUrl, category: selectedCategory, sort_order: baseOrder,
          };
          if (baseDate) {
            bannerData.publish_at = new Date(baseDate.getTime() + r * intervalMs).toISOString();
            bannerData.active = false;
          }
          if (defaultExpires) {
            (bannerData as any).expires_at = new Date(defaultExpires).toISOString();
          }
          try {
            await createBanner.mutateAsync(bannerData);
            okCount += 1;
          } catch (e: any) {
            failCount += 1;
            toast.error(`Falha em ${file.name} (rep ${r + 1})`, { description: e?.message?.slice(0, 100) });
          } finally {
            opIdx += 1;
            setProgress({ current: opIdx, total: totalOps });
          }
        }
      } catch (err: any) {
        failCount += repeats;
        opIdx += repeats;
        setProgress({ current: opIdx, total: totalOps });
        toast.error(`Falha no upload de ${file.name}`, { description: err?.message?.slice(0, 100) });
      }
    }

    setUploading(false);
    setTimeout(() => setProgress(null), 1500);
    if (okCount && !failCount) toast.success(`${okCount} banner${okCount > 1 ? "s" : ""} ${scheduleMode !== "none" ? "agendado(s)" : "enviado(s)"}`);
    else if (okCount && failCount) toast.warning(`${okCount} ok, ${failCount} com erro`);
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 500);
  }, [selectedCategory, banners, createBanner, scheduleDate, scheduleMode, scheduleInvalid, defaultExpires, recurringEnabled, recurringRepeats, recurringIntervalDays]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await uploadMany(files);
    e.target.value = "";
  };

  // Filter + search
  const filteredBanners = useMemo(() => {
    if (!banners) return [] as Banner[];
    const now = Date.now();
    return banners.filter((b) => {
      // status
      const expired = !!b.expires_at && new Date(b.expires_at).getTime() < now;
      const scheduled = !!b.publish_at && !b.active;
      if (statusFilter === "active" && (!b.active || expired)) return false;
      if (statusFilter === "scheduled" && !scheduled) return false;
      if (statusFilter === "inactive" && (b.active || scheduled)) return false;
      if (statusFilter === "expired" && !expired) return false;
      // search (title + filename in URL)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${b.title || ""} ${b.image_url}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [banners, statusFilter, search]);

  // Group filtered banners by effective date (publish_at when scheduled, else created_at)
  const groupedByDate = useMemo(() => {
    const grouped: Record<string, Banner[]> = {};
    filteredBanners.forEach((b) => {
      const effective = b.publish_at ?? b.created_at;
      const dateKey = new Date(effective).toLocaleDateString("pt-BR");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey]!.push(b);
    });
    return grouped;
  }, [filteredBanners]);

  // Drag-end handler — reorders within the same date group
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !banners) return;
    const a = banners.find((b) => b.id === active.id);
    const o = banners.find((b) => b.id === over.id);
    if (!a || !o) return;
    const dateKey = new Date(a.created_at).toLocaleDateString("pt-BR");
    if (dateKey !== new Date(o.created_at).toLocaleDateString("pt-BR")) {
      toast.info("Só é possível reordenar dentro do mesmo dia");
      return;
    }
    const group = groupedByDate[dateKey] || [];
    const oldIdx = group.findIndex((b) => b.id === active.id);
    const newIdx = group.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(group, oldIdx, newIdx);
    // Reassign sort_order using existing values (preserves cross-group ordering)
    const orderValues = group.map((b) => b.sort_order).sort((x, y) => x - y);
    try {
      await Promise.all(
        reordered.map((b, i) => updateBanner.mutateAsync({ id: b.id, sort_order: orderValues[i] })),
      );
    } catch {
      toast.error("Erro ao reordenar");
    }
  };

  const performDeactivateAll = async () => {
    if (!banners) return;
    const activeOnes = banners.filter((b) => b.active);
    if (activeOnes.length === 0) { toast.info("Nenhum banner ativo nesta categoria"); return; }
    const results = await Promise.allSettled(activeOnes.map((b) => updateBanner.mutateAsync({ id: b.id, active: false })));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (fail === 0) toast.success(`${ok} banner(s) desativado(s)`);
    else toast.warning(`${ok} desativado(s), ${fail} com erro`);
  };

  const performDelete = async (id: string) => {
    try { await deleteBanner.mutateAsync(id); toast.success("Banner excluído"); }
    catch { toast.error("Erro ao excluir"); }
  };

  const toggleActive = async (banner: Banner, next: boolean) => {
    try {
      const updates: Partial<Banner> & { id: string } = { id: banner.id, active: next };
      if (next && banner.publish_at && new Date(banner.publish_at) > new Date()) {
        updates.publish_at = null;
        toast.info("Agendamento removido — banner publicado agora");
      }
      await updateBanner.mutateAsync(updates);
    } catch { toast.error("Erro ao atualizar banner"); }
  };

  const updateTitle = async (id: string, title: string) => {
    try {
      await updateBanner.mutateAsync({ id, title: title || null });
      toast.success("Título atualizado");
    } catch { toast.error("Erro ao salvar título"); throw new Error(); }
  };

  const updateExpiresAt = async (id: string, value: string | null) => {
    try {
      await updateBanner.mutateAsync({ id, expires_at: value });
      toast.success(value ? "Expiração atualizada" : "Expiração removida");
    } catch { toast.error("Erro ao salvar expiração"); throw new Error(); }
  };

  const toggleSelect = (id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id); else s.delete(id);
      return s;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(filteredBanners.map((b) => b.id)));

  const runBulk = async () => {
    if (!confirmBulk || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    let results: PromiseSettledResult<unknown>[] = [];
    if (confirmBulk === "delete") {
      results = await Promise.allSettled(ids.map((id) => deleteBanner.mutateAsync(id)));
    } else {
      const active = confirmBulk === "activate";
      results = await Promise.allSettled(ids.map((id) => updateBanner.mutateAsync({ id, active })));
    }
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (fail === 0) toast.success(`${ok} banner(s) atualizado(s)`);
    else toast.warning(`${ok} ok, ${fail} com erro`);
    clearSelection();
    setConfirmBulk(null);
  };

  const activeBanners = banners?.filter((b) => b.active).length || 0;
  const scheduledBanners = banners?.filter((b) => b.publish_at && !b.active).length || 0;
  const inactiveBanners = banners?.filter((b) => !b.active && !b.publish_at).length || 0;
  const expiredBanners = banners?.filter((b) => b.expires_at && new Date(b.expires_at) < new Date()).length || 0;
  const totalBanners = banners?.length || 0;

  const STATUS_CHIPS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: totalBanners },
    { key: "active", label: "Ativos", count: activeBanners },
    { key: "scheduled", label: "Agendados", count: scheduledBanners },
    { key: "inactive", label: "Inativos", count: inactiveBanners },
    { key: "expired", label: "Expirados", count: expiredBanners },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Seções do admin"
        className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {[
          { key: "programacao" as const, label: "📋 Programação" },
          { key: "categories" as const, label: "🖼️ Banners de imagem" },
        ].map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={activeSection === s.key}
            onClick={() => handleSetSection(s.key)}
            className={`shrink-0 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
              activeSection === s.key
                ? "glass-panel bg-white/[0.06] text-foreground border-white/[0.12]"
                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.03]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "programacao" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Gerar texto por imagem (GPT/Gemini)</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-2 text-[11px] font-semibold hover:bg-primary/20 transition-all active:scale-[0.97] min-h-11 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                  aria-label="Ver e copiar prompt-modelo"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Prompt-modelo
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(92vw,520px)] p-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
                  <p className="text-[11px] font-semibold text-foreground">Prompt para imagem → texto</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11 gap-1 text-[11px] text-primary hover:bg-primary/10"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(BANNER_PROMPT_MODEL)
                        .then(() => toast.success("Prompt-modelo copiado!"))
                        .catch(() => toast.error("Falha ao copiar"))
                    }
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-[10.5px] leading-relaxed text-muted-foreground">
                  {BANNER_PROMPT_MODEL}
                </pre>
              </PopoverContent>
            </Popover>
          </div>
          <ProgramacaoTexto />
          <ScheduleVersionHistory />
          <DailyGamesManager />
          <ArchivedGamesManager />
        </div>
      )}

      {activeSection === "categories" && (
        <>
          <ExpiredBannersAlert banners={banners} isLoading={isLoading} />
          <BannerHealthPanel banners={banners} onPreview={() => setPreviewOpen(true)} />

          <div role="tablist" aria-label="Categoria de banner"
            className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
            {CATEGORY_LIST.map((cat) => {
              const count = countsByCategory[cat] ?? 0;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={selectedCategory === cat}
                  aria-label={`${CATEGORY_LABELS[cat]} — ${count} banner(s)`}
                  onClick={() => { setSelectedCategory(cat); clearSelection(); }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all min-h-[44px] ${
                    selectedCategory === cat
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : count === 0
                        ? "glass-panel text-muted-foreground/40 hover:text-foreground"
                        : "glass-panel text-muted-foreground/70 hover:text-foreground"
                  }`}
                >
                  <span className="whitespace-nowrap">{CATEGORY_LABELS[cat]}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] tabular-nums ${count === 0 ? "bg-white/[0.04] text-muted-foreground/40" : "bg-white/[0.08] text-foreground/70"}`}>
                    {count}
                  </span>
                </button>
              );
            })}

          </div>

          <div className="glass-panel rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">{CATEGORY_LABELS[selectedCategory]}</h3>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px]">
                  <span className="text-emerald-400 font-semibold">{activeBanners} ativos</span>
                  {scheduledBanners > 0 && <span className="text-amber-400 font-semibold">{scheduledBanners} agendados</span>}
                  {expiredBanners > 0 && <span className="text-red-400 font-semibold">{expiredBanners} expirados</span>}
                  {inactiveBanners > 0 && <span className="text-muted-foreground">{inactiveBanners} inativos</span>}
                  <span className="text-muted-foreground/50">{totalBanners} total</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <label className="cursor-pointer shrink-0">
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={handleUpload} aria-label="Selecionar imagens para upload" />
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 min-h-[44px] text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.97]">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload (vários)
                    </span>
                  </label>
                  {activeBanners > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(true)}
                      className="text-[11px] text-destructive hover:bg-destructive/10 gap-1.5 min-h-[44px]">
                      <PowerOff className="h-3.5 w-3.5" />
                      Desativar todos
                    </Button>
                  )}
                </div>

                {progress && (
                  <div className="space-y-1" role="status" aria-live="polite">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Enviando {progress.current}/{progress.total}</span>
                      <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
                  </div>
                )}

                <PasteZone onFiles={uploadMany} uploading={uploading} />
              </div>
            </div>

            {/* Schedule + default expires */}
            <div className="p-4 border-b border-amber-500/10 bg-amber-500/[0.03] space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-400">Agendamento de publicação</span>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {([
                    { key: "00" as const, label: "Amanhã 00h" },
                    { key: "06" as const, label: "Amanhã 06h" },
                    { key: "12" as const, label: "Amanhã 12h" },
                    { key: "custom" as const, label: "Personalizado" },
                    { key: "none" as const, label: "Sem agendamento" },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setScheduleMode(opt.key);
                        if (opt.key === "00") setScheduleDate(getScheduleDate(0));
                        else if (opt.key === "06") setScheduleDate(getScheduleDate(6));
                        else if (opt.key === "12") setScheduleDate(getScheduleDate(12));
                        else if (opt.key === "none") setScheduleDate("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all min-h-11 ${
                        scheduleMode === opt.key
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "glass-panel text-muted-foreground/70 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {scheduleMode === "custom" && (
                  <Input type="datetime-local" value={scheduleDate} min={minDatetime}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="text-xs h-10 glass-panel border-amber-500/20 focus-visible:ring-amber-500/30"
                    aria-invalid={scheduleInvalid} />
                )}
                {scheduleInvalid && (
                  <div role="alert" className="flex items-center gap-1.5 text-[10px] text-destructive mt-2">
                    <AlertCircle className="h-3 w-3" /><span>Selecione uma data e hora futuras.</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {scheduleMode === "none"
                    ? "Banners serão publicados imediatamente"
                    : `⏰ Agendado para ${scheduleDate ? new Date(scheduleDate).toLocaleString("pt-BR") : "—"}`}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3 w-3" />
                  Expira em (opcional, aplicado a novos uploads)
                </label>
                <Input type="datetime-local" value={defaultExpires}
                  onChange={(e) => setDefaultExpires(e.target.value)}
                  className="text-xs h-10 glass-panel" placeholder="Sem expiração" />
              </div>

              {/* Recurring schedule */}
              <div className={`rounded-lg p-3 border ${recurringEnabled ? "border-amber-500/30 bg-amber-500/[0.04]" : "border-white/[0.06] bg-transparent"}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={recurringEnabled}
                    onChange={(e) => setRecurringEnabled(e.target.checked)}
                    disabled={scheduleMode === "none"}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="text-[11px] font-semibold text-foreground">
                    Agendamento recorrente
                  </span>
                  {scheduleMode === "none" && (
                    <span className="text-[10px] text-muted-foreground/60">— escolha um agendamento acima primeiro</span>
                  )}
                </label>
                {recurringEnabled && scheduleMode !== "none" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Repetições (1-12)</label>
                        <Input type="number" min={1} max={12} value={recurringRepeats}
                          onChange={(e) => setRecurringRepeats(Number(e.target.value) || 1)}
                          className="text-xs h-9" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Intervalo (dias, 1-30)</label>
                        <Input type="number" min={1} max={30} value={recurringIntervalDays}
                          onChange={(e) => setRecurringIntervalDays(Number(e.target.value) || 1)}
                          className="text-xs h-9" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Cada arquivo enviado gerará <strong className="text-amber-400">{recurringRepeats}</strong> banners
                      espaçados de <strong className="text-amber-400">{recurringIntervalDays}</strong> dia{recurringIntervalDays > 1 ? "s" : ""}.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-white/[0.06] space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou nome de arquivo"
                  className="pl-9 pr-9 h-10 text-xs"
                />
                {search && (
                  <button onClick={() => setSearch("")} aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_CHIPS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setStatusFilter(c.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all min-h-9 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none ${
                      statusFilter === c.key
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "glass-panel text-muted-foreground/80 hover:text-foreground"
                    }`}
                    aria-pressed={statusFilter === c.key}
                  >
                    {c.label}
                    <span className="ml-1 text-muted-foreground/70">({c.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="p-3 border-b border-primary/20 bg-primary/[0.04] flex items-center gap-2 flex-wrap sticky top-0 z-10 backdrop-blur">
                <span className="text-[11px] font-semibold text-primary">{selectedIds.size} selecionado(s)</span>
                <Button size="sm" variant="ghost" className="min-h-11 text-[11px]" onClick={selectAllVisible}>
                  Selecionar todos visíveis
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11 text-[11px]" onClick={clearSelection}>
                  Limpar
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="min-h-11 text-[11px] text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => setConfirmBulk("activate")}>
                  <Power className="h-3 w-3 mr-1" /> Ativar
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11 text-[11px] text-amber-400 hover:bg-amber-500/10"
                  onClick={() => setConfirmBulk("deactivate")}>
                  <PowerOff className="h-3 w-3 mr-1" /> Desativar
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11 text-[11px] text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmBulk("delete")}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remover
                </Button>
              </div>
            )}

            {/* Banner list */}
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="aspect-[16/9] rounded-xl skeleton-shimmer" />
                  ))}
                </div>
              ) : !filteredBanners.length ? (
                <div className="py-12 text-center space-y-3">
                  <div className="rounded-xl glass-panel p-4 inline-block"><ImageIcon className="h-8 w-8 text-muted-foreground/20" /></div>
                  <p className="text-xs text-muted-foreground">
                    {totalBanners === 0 ? "Nenhum banner nesta categoria" : "Nenhum banner corresponde aos filtros"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {totalBanners === 0 ? "Cole, arraste ou clique em \"Upload\" para começar" : "Ajuste a busca ou os filtros de status"}
                  </p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="space-y-5">
                    {Object.keys(groupedByDate).map((dateKey) => {
                      const group = groupedByDate[dateKey]!;
                      const [d, m, y] = dateKey.split("/").map(Number);
                      const groupDate = new Date(y, (m || 1) - 1, d || 1);
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const isFuture = groupDate.getTime() > today.getTime();
                      return (
                        <div key={dateKey}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] font-bold text-foreground">📅 {dateKey}</span>
                            <span className="text-[10px] text-muted-foreground">— {group.length} banner{group.length !== 1 ? "s" : ""}</span>
                            {isFuture && (
                              <span className="text-[10px] text-amber-400 font-semibold">⏰ agendado</span>
                            )}
                          </div>
                          <SortableContext items={group.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                              {group.map((banner) => (
                                <BannerCard
                                  key={banner.id}
                                  banner={banner}
                                  selected={selectedIds.has(banner.id)}
                                  onSelect={toggleSelect}
                                  onToggleActive={toggleActive}
                                  onDelete={(id) => setDeleteId(id)}
                                  onUpdateTitle={updateTitle}
                                  onUpdateExpiresAt={updateExpiresAt}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      );
                    })}
                    <div ref={listEndRef} />
                  </div>
                </DndContext>
              )}
            </div>
          </div>
        </>
      )}

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o banner. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(() => {
            const target = banners?.find((b) => b.id === deleteId);
            if (!target) return null;
            return (
              <div className="flex items-center gap-3 rounded-lg glass-panel p-2.5">
                <img src={target.image_url} alt="" className="h-12 w-20 object-cover rounded-md" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{target.title || CATEGORY_LABELS[target.category]}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(target.created_at).toLocaleDateString("pt-BR")} · {target.active ? "ativo" : "inativo"}
                  </p>
                </div>
              </div>
            );
          })()}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) performDelete(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate-all confirmation */}
      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar todos os banners?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeBanners} banner(s) ativo(s) em {CATEGORY_LABELS[selectedCategory]} ficarão ocultos do público.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { performDeactivateAll(); setConfirmDeactivate(false); }}>
              Desativar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action confirmation */}
      <AlertDialog open={!!confirmBulk} onOpenChange={(o) => !o && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulk === "delete" && `Remover ${selectedIds.size} banner(s)?`}
              {confirmBulk === "deactivate" && `Desativar ${selectedIds.size} banner(s)?`}
              {confirmBulk === "activate" && `Ativar ${selectedIds.size} banner(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulk === "delete"
                ? "Esta ação é permanente."
                : "Você pode reverter depois individualmente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runBulk}
              className={confirmBulk === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BannerPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        category={selectedCategory}
        banners={banners}
      />
    </div>
  );
};

export default AdminProgramacao;
