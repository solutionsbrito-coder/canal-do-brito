import { useMemo } from "react";
import { Bookmark, BookmarkCheck, Check, Clock, ImageOff } from "lucide-react";
import { useActiveMovies } from "@/hooks/useMovies";
import { useActiveSeries } from "@/hooks/useSeries";
import { useMinhaLista } from "@/hooks/useMinhaLista";
import {
  buildCatalogCarousels,
  isLeavingSoon,
  type CatalogTitle,
} from "@/lib/catalogCarousels";

/**
 * Carrosséis do catálogo próprio (Lote 2), na aba Filmes & Séries.
 *
 * Só títulos disponíveis no catálogo próprio entram aqui — títulos
 * fora do catálogo nunca aparecem como disponíveis. Cada card tem o
 * botão da "Minha lista" (sem login, salvo no dispositivo) e o selo
 * "Sai em breve" quando leaves_at está nos próximos 14 dias.
 * O CTA é textual ("Assistir no Canal do Brito"): nenhum card aponta
 * para plataforma externa.
 */

const TitleCard = ({ title }: { title: CatalogTitle }) => {
  const { get, setStatus, remove } = useMinhaLista();
  const saved = get(title.kind, title.id);
  const leaving = isLeavingSoon(title.leaves_at);

  return (
    <div className="shrink-0 w-[42vw] max-w-[164px] sm:w-40 md:w-44">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-2 border border-border mb-2">
        {title.poster_url ? (
          <img
            src={title.poster_url}
            alt={title.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground/20" aria-hidden />
          </div>
        )}
        {leaving && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" aria-hidden /> Sai em breve
          </span>
        )}
        {title.featured && (
          <span className="absolute top-2 right-2 z-10 bg-primary/90 text-[#07080a] text-[10px] font-bold px-2 py-1 rounded-lg">
            Em alta
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight font-body">
        {title.title}
      </h3>
      <p className="text-[10px] text-muted-foreground font-body mt-0.5">
        {title.kind === "series" ? "📺 Série" : "🎬 Filme"}
        {title.year ? ` • ${title.year}` : ""}
        {title.catalog_category ? ` • ${title.catalog_category}` : ""}
      </p>
      <p className="text-[10px] text-primary font-semibold font-body mt-1">
        Assistir no Canal do Brito
      </p>
      <div className="flex gap-1.5 mt-2">
        <button
          type="button"
          onClick={() =>
            saved?.status === "want"
              ? remove(title.kind, title.id)
              : setStatus(
                  {
                    kind: title.kind,
                    id: title.id,
                    title: title.title,
                    poster_url: title.poster_url,
                  },
                  "want",
                )
          }
          aria-pressed={saved?.status === "want"}
          className={`inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-full text-[10px] font-bold border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            saved?.status === "want"
              ? "bg-primary/15 text-primary border-primary/30"
              : "text-white/70 border-white/10 hover:bg-white/5"
          }`}
        >
          {saved?.status === "want" ? (
            <BookmarkCheck className="w-3 h-3" aria-hidden />
          ) : (
            <Bookmark className="w-3 h-3" aria-hidden />
          )}
          Quero ver
        </button>
        <button
          type="button"
          onClick={() =>
            saved?.status === "watched"
              ? remove(title.kind, title.id)
              : setStatus(
                  {
                    kind: title.kind,
                    id: title.id,
                    title: title.title,
                    poster_url: title.poster_url,
                  },
                  "watched",
                )
          }
          aria-pressed={saved?.status === "watched"}
          className={`inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-full text-[10px] font-bold border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            saved?.status === "watched"
              ? "bg-primary/15 text-primary border-primary/30"
              : "text-white/70 border-white/10 hover:bg-white/5"
          }`}
        >
          <Check className="w-3 h-3" aria-hidden /> Já vi
        </button>
      </div>
    </div>
  );
};

const Rail = ({ title, emoji, items }: { title: string; emoji: string; items: CatalogTitle[] }) => {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="px-4 font-display text-xl tracking-wide text-foreground">
        {emoji} {title}
      </h2>
      <div className="-mx-0 px-4 flex gap-3 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {items.map((t) => (
          <TitleCard key={`${t.kind}:${t.id}`} title={t} />
        ))}
      </div>
    </section>
  );
};

/** Seção "Minha lista" — só o que o visitante salvou neste dispositivo. */
export const MinhaListaSection = () => {
  const { items, remove } = useMinhaLista();
  const { data: movies } = useActiveMovies();
  const { data: series } = useActiveSeries();
  const availability = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const mv of movies ?? []) {
      m.set(`movie:${mv.id}`, mv.available_in_catalog ?? true);
    }
    for (const s of series ?? []) {
      m.set(`series:${s.id}`, s.available_in_catalog ?? true);
    }
    return m;
  }, [movies, series]);

  // Lote 2.1: seção visível mesmo vazia. Antes retornava null quando
  // não havia itens, então o visitante nunca descobria a feature com
  // o catálogo vazio. Não cria dados nem mostra títulos inexistentes.
  if (items.length === 0) {
    return (
      <section aria-label="Minha lista" className="space-y-3 px-4">
        <h2 className="font-display text-xl tracking-wide text-foreground">🔖 Minha lista</h2>
        <p className="text-[11px] text-muted-foreground font-body">
          Salva só neste dispositivo, sem login. Se trocar de aparelho ou limpar
          os dados, a lista some.
        </p>
        <p className="text-[12px] text-white/60 font-body">
          Você ainda não salvou nenhum título. Quando houver filmes e séries no
          catálogo, abra um título e toque em “Quero ver” ou “Já vi” para ele
          aparecer aqui.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Minha lista" className="space-y-3 px-4">
      <h2 className="font-display text-xl tracking-wide text-foreground">🔖 Minha lista</h2>
      <p className="text-[11px] text-muted-foreground font-body">
        Salva só neste dispositivo, sem login. Se trocar de aparelho ou limpar
        os dados, a lista some.
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {items.map((i) => {
          const available = availability.get(`${i.kind}:${i.id}`);
          return (
            <div key={`${i.kind}:${i.id}`} className="shrink-0 w-[42vw] max-w-[164px] sm:w-40 md:w-44">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-2 border border-border mb-2">
                {i.poster_url ? (
                  <img src={i.poster_url} alt={i.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-muted-foreground/20" aria-hidden />
                  </div>
                )}
                {available === false && (
                  <span className="absolute top-2 left-2 bg-black/70 text-white/85 text-[10px] font-bold px-2 py-1 rounded-lg">
                    Fora do catálogo
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight font-body">{i.title}</h3>
              <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                {i.status === "want" ? "Quero ver" : "Já vi"}
                {available === false ? " · não disponível no momento" : ""}
              </p>
              <button
                type="button"
                onClick={() => remove(i.kind, i.id)}
                className="mt-2 inline-flex items-center min-h-[32px] px-2.5 rounded-full text-[10px] font-bold text-white/70 border border-white/10 hover:bg-white/5 transition active:scale-95"
              >
                Remover
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const CatalogCarousels = () => {
  const { data: movies } = useActiveMovies();
  const { data: series } = useActiveSeries();
  const carousels = useMemo(
    () => buildCatalogCarousels(movies ?? [], series ?? []),
    [movies, series],
  );
  if (
    carousels.novos.length === 0 &&
    carousels.emAlta.length === 0 &&
    carousels.maratonar.length === 0
  ) {
    return null;
  }
  return (
    <div className="space-y-8">
      <Rail title="Novos no nosso app" emoji="✨" items={carousels.novos} />
      <Rail title="Em alta no nosso app" emoji="🔥" items={carousels.emAlta} />
      <Rail title="Para maratonar no fim de semana" emoji="🍿" items={carousels.maratonar} />
    </div>
  );
};
