import { Rocket } from "lucide-react";

export const ReleaseBanner = () => (
  <section className="px-4">
    <div className="relative rounded-2xl overflow-hidden border border-secondary/20 p-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-secondary/10" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 space-y-3">
        <span className="text-xs font-semibold text-secondary font-body">
          ✨ Novidades da Semana
        </span>
        <h2 className="font-display text-[32px] tracking-[3px] text-foreground leading-none">
          LANÇAMENTOS
        </h2>
        <p className="text-xs text-muted-foreground font-body">
          6 novos títulos adicionados esta semana
        </p>
        <button className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-secondary-foreground transition-transform active:scale-95">
          <Rocket className="h-4 w-4" />
          Explorar
        </button>
      </div>

      {/* Floating emoji */}
      <span className="absolute bottom-4 right-6 text-3xl animate-float opacity-60">🎬</span>
    </div>
  </section>
);
