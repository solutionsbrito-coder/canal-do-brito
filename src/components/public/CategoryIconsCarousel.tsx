import React, { useRef, useCallback } from "react";

const categories = [
  { emoji: "🔥", label: "Em Alta", action: { tab: "novidades" } },
  { emoji: "⚽", label: "Futebol", action: { tab: "schedule" } },
  { emoji: "🏀", label: "Basquete", action: { tab: "schedule" } },
  { emoji: "🥊", label: "UFC/MMA", action: { tab: "schedule" } },
  { emoji: "🎬", label: "Filmes", action: { tab: "novidades" } },
  { emoji: "📺", label: "Séries", action: { tab: "novidades" } },
  { emoji: "🏅", label: "Esportes", action: { tab: "schedule" } },
  { emoji: "🎾", label: "Tênis", action: { tab: "schedule" } },
  { emoji: "🏆", label: "Destaques", action: { tab: "novidades" } },
];

const carouselItems = [...categories, ...categories, ...categories];

export const CategoryIconsCarousel = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAnimation = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    trackRef.current?.classList.add("paused");
  }, []);

  const resumeAnimation = useCallback(() => {
    resumeTimer.current = setTimeout(() => {
      trackRef.current?.classList.remove("paused");
    }, 2000);
  }, []);

  const handleClick = useCallback((action: { tab: string }, label: string) => {
    console.log('[Home:category-select]', label);
    window.dispatchEvent(new CustomEvent("nav-tab-change", { detail: action.tab }));
  }, []);

  return (
    <section className="py-3 animate-fade-up stagger-3">
      <div
        data-horizontal-scroll
        className="overflow-hidden marquee-container marquee-mask"
        onTouchStart={pauseAnimation}
        onTouchEnd={resumeAnimation}
      >
        <div
          ref={trackRef}
          className="marquee-track flex gap-2.5 w-max"
        >
          {carouselItems.map((cat, i) => {
            const isFirst = cat.label === "Em Alta";
            return (
              <button
                key={`${cat.label}-${i}`}
                onClick={() => handleClick(cat.action, cat.label)}
                aria-label={`Filtrar por ${cat.label}`}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none min-h-[44px] active:scale-95 ${
                  isFirst
                    ? "bg-green-dim border-green-border"
                    : "bg-surface border-border hover:border-primary/30"
                }`}
              >
                <span className="text-sm">{cat.emoji}</span>
                <span
                  className={`text-[11px] font-semibold whitespace-nowrap font-body ${
                    isFirst ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
