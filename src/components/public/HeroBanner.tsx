import { useState, useEffect } from "react";
import { Play, Info, Star } from "lucide-react";

const heroItems = [
  {
    title: "PÂNICO 7",
    type: "🎬 Filme · 2026",
    desc: "Ghostface retorna em mais um capítulo aterrorizante da franquia clássica de terror.",
    rating: 6.0,
    badge: "Novo Lançamento",
    poster: "https://image.tmdb.org/t/p/w780/fXTxfMVnNXCfOlBJsBuASSvJbJR.jpg",
  },
  {
    title: "A NOBREZA DO AMOR",
    type: "📺 Série · 2026",
    desc: "Um drama épico sobre paixão, poder e traição em uma corte renascentista.",
    rating: 8.2,
    badge: "Em Alta",
    poster: "https://image.tmdb.org/t/p/w780/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
  },
  {
    title: "CARA DE UM FOCINHO DE OUTRO",
    type: "🎬 Filme · 2026",
    desc: "Uma animação divertida que conquistou o coração de crianças e adultos pelo mundo.",
    rating: 7.7,
    badge: "Destaque",
    poster: "https://image.tmdb.org/t/p/w780/zj4CovIPFNjIqitmKVSKfOlBJsR.jpg",
  },
];

export const HeroBanner = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % heroItems.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const item = heroItems[current];

  return (
    <div className="px-4">
      <div className="relative h-[420px] rounded-3xl overflow-hidden">
        {/* Background image with zoom */}
        <div
          className="absolute inset-0 bg-cover bg-center animate-hero-zoom"
          style={{ backgroundImage: `url(${item.poster})` }}
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        {/* Badge top-left */}
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/90 px-2.5 py-1 text-[10px] font-bold text-white animate-pulse-live">
            ● {item.badge}
          </span>
        </div>

        {/* Rating top-right */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-lg bg-black/40 backdrop-blur-md border border-accent3/20 px-2.5 py-1">
          <Star className="h-3 w-3 text-accent3 fill-accent3" />
          <span className="text-[11px] font-bold text-accent3">{item.rating.toFixed(1)}</span>
        </div>

        {/* Content bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3 z-10">
          <span className="inline-block rounded-full bg-gradient-to-r from-secondary/30 to-primary/30 border border-secondary/20 px-3 py-1 text-[10px] font-semibold text-foreground/80 font-body">
            {item.type}
          </span>

          <h2 className="font-display text-[46px] leading-[0.9] tracking-[3px] text-foreground">
            {item.title}
          </h2>

          <p className="text-xs text-foreground/65 font-body leading-relaxed line-clamp-2 max-w-[85%]">
            {item.desc}
          </p>

          <div className="flex gap-3 pt-1">
            <button className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_hsl(160,100%,45%,0.3)] transition-transform active:scale-95">
              <Play className="h-4 w-4 fill-current" />
              Assistir
            </button>
            <button className="flex items-center gap-2 rounded-xl glass-card px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform active:scale-95">
              <Info className="h-4 w-4" />
              Detalhes
            </button>
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 right-5 flex gap-1.5 z-10">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-5 h-2 bg-primary"
                  : "w-2 h-2 bg-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
