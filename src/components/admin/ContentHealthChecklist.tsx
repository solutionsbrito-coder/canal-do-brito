import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyGame } from "@/hooks/useDailyGames";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChannelMappings } from "@/hooks/useChannelMappings";
import { resolveChannels, mappingHasLogo } from "@/lib/channelResolver";
import { builtinLogoKey } from "@/components/public/ChannelBadge";
import { isChannelFragment } from "@/components/public/channelLogos";

type Level = "ok" | "warn" | "error";

interface CheckItem {
  id: string;
  level: Level;
  label: string;
  detail?: string;
  route?: string;
}

interface Props {
  todayGames: DailyGame[] | undefined;
  tomorrowGames: DailyGame[] | undefined;
  banners: { active: boolean; expires_at: string | null }[] | undefined;
  movies: { active: boolean; genre: string | null; backdrop_url: string | null }[] | undefined;
  series: { active: boolean; genre: string | null; backdrop_url: string | null }[] | undefined;
  news: { active: boolean; genres: string | null }[] | undefined;
  isLoading: boolean;
}

const ICON: Record<Level, typeof CheckCircle2> = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle };
const TONE: Record<Level, string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-rose-400",
};

/** Checklist de saúde do conteúdo: o que falta para o site estar "redondo" hoje. */
export const ContentHealthChecklist = ({ todayGames, tomorrowGames, banners, movies, series, news, isLoading }: Props) => {
  const navigate = useNavigate();
  const { data: mappings } = useChannelMappings();
  const { data: aliasRows } = useQuery({
    queryKey: ["channel_aliases", "all-health"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("channel_aliases").select("mapping_id, alias, alias_normalized");
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = useMemo<CheckItem[]>(() => {
    const now = Date.now();
    const list: CheckItem[] = [];

    const todayActive = (todayGames ?? []).filter((g) => g.active && !g.archived);
    const todayScheduled = (todayGames ?? []).filter((g) => !g.active && g.publish_at && new Date(g.publish_at).getTime() > now);
    if (todayActive.length === 0 && todayScheduled.length === 0) {
      list.push({ id: "today", level: "error", label: "Programação de hoje não publicada", detail: "Cole o texto do WhatsApp e publique.", route: "/admin/programacao" });
    } else if (todayActive.length === 0) {
      list.push({ id: "today", level: "warn", label: `Programação de hoje só agendada (${todayScheduled.length})`, route: "/admin/programacao" });
    } else {
      list.push({ id: "today", level: "ok", label: `Programação de hoje no ar (${todayActive.length} jogo${todayActive.length === 1 ? "" : "s"})`, route: "/admin/programacao" });
    }

    const noChannel = todayActive.filter((g) => !g.channels || g.channels.length === 0);
    if (noChannel.length > 0) {
      list.push({ id: "nochannel", level: "warn", label: `${noChannel.length} jogo${noChannel.length === 1 ? "" : "s"} de hoje sem canal`, route: "/admin/programacao" });
    }
    // ---- Canais ----
    const todayChannels = todayActive.flatMap((g) => (g.channels ?? []).filter((c) => c && !isChannelFragment(c)));
    const resolvedToday = resolveChannels(todayChannels, mappings);
    const unknownToday = resolvedToday.filter((r) => r.status === "unknown" && !builtinLogoKey(r.name));
    const unregisteredToday = resolvedToday.filter((r) => r.status === "canonical" || (r.status === "unknown" && !!builtinLogoKey(r.name)));
    if (unknownToday.length > 0) {
      list.push({
        id: "unknown-channels",
        level: "warn",
        label: `${unknownToday.length} canal${unknownToday.length === 1 ? "" : "is"} desconhecido${unknownToday.length === 1 ? "" : "s"} na programação de hoje`,
        detail: unknownToday.map((r) => r.input).slice(0, 4).join(", "),
        route: "/admin/canais-logos",
      });
    }
    if (unregisteredToday.length > 0) {
      list.push({
        id: "unregistered-channels",
        level: "warn",
        label: `${unregisteredToday.length} cana${unregisteredToday.length === 1 ? "l" : "is"} de hoje sem cadastro (usando regra automática)`,
        detail: unregisteredToday.map((r) => r.name).slice(0, 4).join(", "),
        route: "/admin/canais-logos",
      });
    }
    const noLogoToday = resolvedToday.filter((r) => r.mapping && !mappingHasLogo(r.mapping) && !builtinLogoKey(r.name));
    if (noLogoToday.length > 0) {
      list.push({
        id: "nologo-channels",
        level: "warn",
        label: `${noLogoToday.length} cana${noLogoToday.length === 1 ? "l" : "is"} de hoje sem logo`,
        detail: noLogoToday.map((r) => r.name).slice(0, 4).join(", "),
        route: "/admin/canais-logos?filtro=sem-logo",
      });
    }
    if (aliasRows && mappings) {
      const byMappingName = new Map<string, string>();
      for (const m of mappings.values()) byMappingName.set(m.name_normalized, m.id);
      const seen = new Map<string, string>();
      const dupes = new Set<string>();
      for (const a of aliasRows) {
        const ownerOfName = byMappingName.get(a.alias_normalized);
        if (ownerOfName && ownerOfName !== a.mapping_id) dupes.add(a.alias);
        const prev = seen.get(a.alias_normalized);
        if (prev && prev !== a.mapping_id) dupes.add(a.alias);
        seen.set(a.alias_normalized, a.mapping_id);
      }
      if (dupes.size > 0) {
        list.push({
          id: "alias-dupes",
          level: "warn",
          label: `${dupes.size} apelido${dupes.size === 1 ? "" : "s"} de canal em conflito`,
          detail: [...dupes].slice(0, 4).join(", "),
          route: "/admin/canais-logos?filtro=conflitos",
        });
      }
    }
    if (unknownToday.length === 0 && unregisteredToday.length === 0 && noLogoToday.length === 0 && todayChannels.length > 0) {
      list.push({ id: "channels-ok", level: "ok", label: "Canais de hoje todos cadastrados e com logo" });
    }

    const zeroTime = todayActive.filter((g) => !g.game_time || g.game_time.startsWith("00:00"));
    if (zeroTime.length > 0) {
      list.push({ id: "zerotime", level: "warn", label: `${zeroTime.length} jogo${zeroTime.length === 1 ? "" : "s"} com horário 00:00`, route: "/admin/programacao" });
    }

    const tomorrowAny = (tomorrowGames ?? []).filter((g) => !g.archived);
    list.push(
      tomorrowAny.length > 0
        ? { id: "tomorrow", level: "ok", label: `Amanhã já tem ${tomorrowAny.length} jogo${tomorrowAny.length === 1 ? "" : "s"} carregado${tomorrowAny.length === 1 ? "" : "s"}`, route: "/admin/programacao" }
        : { id: "tomorrow", level: "warn", label: "Programação de amanhã ainda vazia", detail: "Opcional, mas evita correria de manhã.", route: "/admin/programacao" },
    );

    const expired = (banners ?? []).filter((b) => b.active && b.expires_at && new Date(b.expires_at).getTime() < now).length;
    if (expired > 0) {
      list.push({ id: "banners", level: "warn", label: `${expired} banner${expired === 1 ? "" : "s"} vencido${expired === 1 ? "" : "s"} ainda ativo${expired === 1 ? "" : "s"}`, route: "/admin/programacao?tab=categories" });
    }

    const incompleteMovies = (movies ?? []).filter((m) => m.active && (!m.genre || !m.backdrop_url)).length;
    const incompleteSeries = (series ?? []).filter((s) => s.active && (!s.genre || !s.backdrop_url)).length;
    const incompleteNews = (news ?? []).filter((n) => n.active && !n.genres).length;
    const incomplete = incompleteMovies + incompleteSeries + incompleteNews;
    if (incomplete > 0) {
      const parts = [
        incompleteMovies ? `${incompleteMovies} filme${incompleteMovies === 1 ? "" : "s"}` : null,
        incompleteSeries ? `${incompleteSeries} série${incompleteSeries === 1 ? "" : "s"}` : null,
        incompleteNews ? `${incompleteNews} novidade${incompleteNews === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      list.push({
        id: "incomplete",
        level: "warn",
        label: `${incomplete} conteúdo${incomplete === 1 ? "" : "s"} incompleto${incomplete === 1 ? "" : "s"} (gênero/imagem)`,
        detail: parts.join(" · "),
        route: incompleteMovies ? "/admin/filmes" : incompleteSeries ? "/admin/series" : "/admin/novidades",
      });
    } else {
      list.push({ id: "incomplete", level: "ok", label: "Filmes, séries e novidades completos" });
    }

    const activeNews = (news ?? []).filter((n) => n.active).length;
    if (activeNews === 0) {
      list.push({ id: "news", level: "warn", label: "Nenhuma novidade ativa na vitrine", route: "/admin/novidades" });
    }

    const priority: Record<Level, number> = { error: 0, warn: 1, ok: 2 };
    return list.sort((a, b) => priority[a.level] - priority[b.level]);
  }, [todayGames, tomorrowGames, banners, movies, series, news, mappings, aliasRows]);

  const errors = items.filter((i) => i.level === "error").length;
  const warns = items.filter((i) => i.level === "warn").length;
  const summary =
    errors > 0 ? `${errors} pendência${errors === 1 ? "" : "s"} crítica${errors === 1 ? "" : "s"}` :
    warns > 0 ? `${warns} aviso${warns === 1 ? "" : "s"}` :
    "Tudo em ordem";
  const summaryTone = errors > 0 ? TONE.error : warns > 0 ? TONE.warn : TONE.ok;

  return (
    <section className="glass-panel rounded-xl p-4 border border-white/[0.08]" aria-labelledby="health-checklist-title">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 id="health-checklist-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Central de pendências</h2>
        {!isLoading && <span className={`text-[11px] font-bold ${summaryTone}`}>{summary}</span>}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = ICON[item.level];
            const content = (
              <>
                <Icon className={`h-4 w-4 shrink-0 ${TONE[item.level]}`} aria-hidden />
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-xs font-semibold text-foreground truncate">{item.label}</span>
                  {item.detail && <span className="block text-[10px] text-muted-foreground truncate">{item.detail}</span>}
                </span>
                {item.route && <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" aria-hidden />}
              </>
            );
            return (
              <li key={item.id}>
                {item.route ? (
                  <button
                    type="button"
                    onClick={() => navigate(item.route!)}
                    className="w-full flex items-center gap-3 rounded-lg px-2 py-2 min-h-11 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-primary/40 outline-none transition-colors"
                    aria-label={`${item.label}. Abrir`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg px-2 py-2 min-h-11">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
