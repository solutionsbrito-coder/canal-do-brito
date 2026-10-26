import { Link } from "react-router-dom";

export const PromoStrip = () => (
  <section className="px-4 animate-fade-up stagger-7">
    <div className="rounded-[13px] bg-green-dim border border-green-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 font-body">
          Brito Solutions · Premium
        </p>
        <h3 className="font-display text-lg sm:text-2xl text-foreground tracking-wide leading-none">
          ACESSE TUDO SEM LIMITES
        </h3>
        <p className="text-[11px] text-muted-foreground font-body">
          Esportes, filmes e séries · Cancele quando quiser
        </p>
      </div>
      <Link
        to="/assinar"
        className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-5 py-3 rounded-full hover:opacity-90 transition-opacity text-center min-h-[44px] flex items-center justify-center"
      >
        Assinar agora →
      </Link>
    </div>
  </section>
);
