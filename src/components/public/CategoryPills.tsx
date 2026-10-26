import { useState } from "react";

const categories = [
  { id: "all", label: "Todos" },
  { id: "movies", label: "🎬 Filmes" },
  { id: "series", label: "📺 Séries" },
  { id: "sports", label: "⚽ Esportes" },
  { id: "new", label: "🆕 Lançamentos" },
  { id: "trending", label: "🔥 Em Alta" },
];

interface CategoryPillsProps {
  onFilter?: (id: string) => void;
}

export const CategoryPills = ({ onFilter }: CategoryPillsProps) => {
  const [active, setActive] = useState("all");

  const handleClick = (id: string) => {
    setActive(id);
    onFilter?.(id);
  };

  return (
    <div data-horizontal-scroll className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 py-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleClick(cat.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold font-body transition-all duration-200 touch-target ${
            active === cat.id
              ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(160,100%,45%,0.3)]"
              : "border border-border/30 text-muted-foreground hover:border-border/60"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
};
