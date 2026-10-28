import { useMemo } from "react";
import { CalendarDays, Heart, Star, X } from "lucide-react";
import { useAllDailyGamesRange } from "@/hooks/useDailyGames";
import { useMeuCanal } from "@/hooks/useMeuCanal";
import { hasAnyFollow, matchesFollowed } from "@/lib/meuCanal";
import { getLocalDateString, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import { detectedSport } from "@/components/agenda/public/highlightsCuration";
import { GamePremiumCard } from "@/components/agenda/public/GamePremiumCard";
import { GlobalNotificationToggle } from "@/components/public/GlobalNotificationToggle";
import { offsetDateStr } from "@/lib/whatsappText";
import { Button } from "@/components/ui/button";

/**
 * Aba "Meus jogos" — só o que o visitante segue, sem login.
 *
 * As preferências vivem no localStorage deste dispositivo (ver
 * src/lib/meuCanal.ts). A aba lista hoje + amanhã, porque a agenda
 * pública só cobre esses dois dias. Sem follows, mostra sugestões
 * (times, esportes e competições presentes nos jogos carregados)
 * para o visitante começar com um toque, sem digitar nada.
 */
const MeusJogosTab = () => {
  const { prefs, toggleTeam, toggleSport, toggleCompetition, clearAll } = useMeuCanal();
  const today = getLocalDateString();
  const tomorrow = offsetDateStr(today, 1);

  const gamesQuery = useAllDailyGamesRange([today, tomorrow]);
  const allGames = useMemo(
    () => (gamesQuery.data ?? []).filter((g) => !g.archived && g.active),
    [gamesQuery.data],
  );

  const myGames = useMemo(() => {
    const list = allGames.filter((g) =>
      matchesFollowed({ ...g, sport: detectedSport(g) }, prefs),
    );
    return [...list].sort((a, b) =>
      a.date === b.date ? a.game_time.localeCompare(b.game_time) : a.date.localeCompare(b.date),
    );
  }, [allGames, prefs]);

  const suggestions = useMemo(() => {
    const teams = new Map<string, string>();
    const sports = new Map<string, string>();
    const comps = new Map<string, string>();
    for (const g of allGames) {
      for (const t of [g.home_team, g.away_team]) {
        if (t) teams.set(t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(), t);
      }
      const s = detectedSport(g);
      sports.set(s, SPORT_LABEL[s] ?? s);
      if (g.competition) {
        comps.set(
          g.competition.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(),
          g.competition,
        );
      }
    }
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return {
      teams: [...teams.values()].filter((t) => !prefs.teams.some((p) => norm(p) === norm(t))).slice(0, 20),
      sports: [...sports.entries()]
        .filter(([code]) => !prefs.sports.includes(code))
        .map(([code, label]) => ({ code, label })),
      comps: [...comps.values()].filter((c) => !prefs.competitions.some((p) => norm(p) === norm(c))).slice(0, 20),
    };
  }, [allGames, prefs]);

  const following = hasAnyFollow(prefs);
  const todayGames = myGames.filter((g) => g.date === today);
  const tomorrowGames = myGames.filter((g) => g.date === tomorrow);

  const chip = "inline-flex items-center gap-1 min-h-[36px] px-3 rounded-full text-[11px] font-semibold border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <div className="mx-auto w-full max-w-[460px] md:max-w-[1100px] px-4 md:px-6 pt-4 pb-6 text-white">
      <h1
        className="text-[34px] md:text-[48px] leading-[0.9] tracking-tight"
        style={{ fontFamily: "Bebas Neue, sans-serif", color: "#00ff87" }}
      >
        MEUS JOGOS
      </h1>
      <p className="text-[13px] text-white/65 mt-1">
        Só o que você segue, neste dispositivo. Sem login, sem conta.
      </p>
      <p className="text-[11px] text-white/45 mt-1">
        Se trocar de aparelho ou limpar os dados do navegador, os follows somem — basta seguir de novo.
      </p>

      {/* Botão global de notificações: fica aqui (e não só no sino de
          um jogo) porque Meu Canal é o espaço pessoal do visitante,
          sem login, no mesmo modelo da inscrição push — do aparelho,
          não de uma conta. Visível mesmo sem follows, para o leigo
          liberar uma única vez antes de procurar um jogo. */}
      <GlobalNotificationToggle />

      {/* O que sigo */}
      {following && (
        <section className="mt-4 space-y-2" aria-label="O que você segue">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-white/70">Você segue</h2>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="min-h-11 text-[11px] text-white/60">
              Limpar tudo
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {prefs.teams.map((t) => (
              <button key={`t-${t}`} type="button" onClick={() => toggleTeam(t)} aria-label={`Deixar de seguir ${t}`} className={`${chip} bg-primary/15 text-primary border-primary/30`}>
                <Star className="h-3 w-3" aria-hidden /> {t} <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            {prefs.sports.map((s) => (
              <button key={`s-${s}`} type="button" onClick={() => toggleSport(s)} aria-label={`Deixar de seguir ${SPORT_LABEL[s as SportType] ?? s}`} className={`${chip} bg-primary/15 text-primary border-primary/30`}>
                <Heart className="h-3 w-3" aria-hidden /> {SPORT_LABEL[s as SportType] ?? s} <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            {prefs.competitions.map((c) => (
              <button key={`c-${c}`} type="button" onClick={() => toggleCompetition(c)} aria-label={`Deixar de seguir ${c}`} className={`${chip} bg-primary/15 text-primary border-primary/30`}>
                {c} <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sugestões para começar */}
      {(suggestions.teams.length > 0 || suggestions.sports.length > 0 || suggestions.comps.length > 0) && (
        <section className="mt-4 space-y-2" aria-label="Sugestões para seguir">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-white/70">
            {following ? "Seguir mais" : "Comece seguindo"}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.teams.map((t) => (
              <button key={`st-${t}`} type="button" onClick={() => toggleTeam(t)} aria-label={`Seguir ${t}`} className={`${chip} text-white/70 border-white/10 hover:bg-white/5`}>
                + {t}
              </button>
            ))}
            {suggestions.sports.map(({ code, label }) => (
              <button key={`ss-${code}`} type="button" onClick={() => toggleSport(code)} aria-label={`Seguir ${label}`} className={`${chip} text-white/70 border-white/10 hover:bg-white/5`}>
                + {label}
              </button>
            ))}
            {suggestions.comps.map((c) => (
              <button key={`sc-${c}`} type="button" onClick={() => toggleCompetition(c)} aria-label={`Seguir ${c}`} className={`${chip} text-white/70 border-white/10 hover:bg-white/5`}>
                + {c}
              </button>
            ))}
          </div>
        </section>
      )}

      {gamesQuery.isLoading && <p className="text-white/55 text-sm mt-6">Carregando seus jogos…</p>}

      {!gamesQuery.isLoading && !following && (
        <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] mt-6" role="status">
          <p className="text-white/85 text-[15px] font-semibold">Você ainda não segue nada.</p>
          <p className="text-white/55 text-[12.5px] mt-1">
            Toque em um time, esporte ou competição acima — ou no botão “Seguir” de qualquer jogo na
            Programação — e seus jogos aparecem aqui.
          </p>
        </div>
      )}

      {!gamesQuery.isLoading && following && myGames.length === 0 && (
        <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] mt-6" role="status">
          <CalendarDays className="w-8 h-8 mx-auto mb-3 text-white/45" aria-hidden />
          <p className="text-white/85 text-[15px] font-semibold">Nenhum jogo do que você segue hoje ou amanhã.</p>
          <p className="text-white/55 text-[12.5px] mt-1">Quando entrar um jogo, ele aparece aqui automaticamente.</p>
        </div>
      )}

      {todayGames.length > 0 && (
        <section className="mt-6" aria-label="Meus jogos de hoje">
          <h2 className="text-[20px] uppercase tracking-wide mb-2.5" style={{ fontFamily: "Bebas Neue, sans-serif" }}>
            Hoje · {todayGames.length} {todayGames.length === 1 ? "jogo" : "jogos"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {todayGames.map((g, i) => (
              <GamePremiumCard key={g.id} game={g} index={i} showSport showActions />
            ))}
          </div>
        </section>
      )}
      {tomorrowGames.length > 0 && (
        <section className="mt-6" aria-label="Meus jogos de amanhã">
          <h2 className="text-[20px] uppercase tracking-wide mb-2.5" style={{ fontFamily: "Bebas Neue, sans-serif" }}>
            Amanhã · {tomorrowGames.length} {tomorrowGames.length === 1 ? "jogo" : "jogos"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {tomorrowGames.map((g, i) => (
              <GamePremiumCard key={g.id} game={g} index={i} showSport showActions />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MeusJogosTab;
