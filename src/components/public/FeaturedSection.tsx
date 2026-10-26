import { Star, ImageOff } from "lucide-react";

const items = [
  { id: 1, title: "ONE - A Série", year: 2023, genre: "Drama/Crime", badge: "🆕 Novo", badgeColor: "bg-primary/15 text-primary border-primary/20", emoji: "🎭", rating: 7.9 },
  { id: 2, title: "Dragões do Norte", year: 2025, genre: "Fantasia", badge: "⭐ Top 10", badgeColor: "bg-accent3/15 text-accent3 border-accent3/20", emoji: "🐉", rating: 8.5 },
  { id: 3, title: "Um Cabra Bom de Bola", year: 2025, genre: "Comédia", badge: "🆕 Novo", badgeColor: "bg-primary/15 text-primary border-primary/20", emoji: "⚽", rating: 7.1 },
];

export const FeaturedSection = () => (
  <section className="space-y-4 px-4">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 rounded-lg bg-accent3/15 border border-accent3/15">
        <Star className="h-4 w-4 text-accent3 fill-accent3" />
      </div>
      <h2 className="font-display text-xl tracking-[2px] text-foreground">
        Em Destaque
      </h2>
    </div>

    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-3.5 rounded-2xl bg-card border border-border/10 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_hsl(260,84%,58%,0.1)] cursor-pointer"
        >
          {/* Thumb */}
          <div className="shrink-0 w-[110px] h-[80px] rounded-xl bg-gradient-to-br from-secondary/10 to-card flex items-center justify-center text-3xl overflow-hidden border border-border/10">
            {item.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
            <span className={`inline-flex text-[9px] font-bold rounded-md px-2 py-0.5 border ${item.badgeColor} font-body`}>
              {item.badge}
            </span>
            <p className="text-sm font-bold text-foreground font-body line-clamp-1">
              {item.title}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-body">
              <span>{item.year}</span>
              <span>·</span>
              <span>{item.genre}</span>
              {item.rating && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-accent3">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    {item.rating}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);
