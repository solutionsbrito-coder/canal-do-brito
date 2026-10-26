import { useState, useEffect } from "react";

const SECTIONS = [
  { id: "all", label: "Todos", icon: "🏠" },
  { id: "esportes", label: "Esportes", icon: "⚽" },
  { id: "novidades", label: "Novidades", icon: "🔥" },
  { id: "assista", label: "Assista Hoje", icon: "🎬" },
];

export const CategoryBar = () => {
  const [active, setActive] = useState("all");
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (id: string) => {
    setActive(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const offset = 110;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`sticky top-[49px] sm:top-[57px] z-40 transition-all duration-300 ${
        isSticky
          ? "bg-background/90 backdrop-blur-xl border-b border-border/10 shadow-[0_2px_12px_hsl(0,0%,0%,0.3)]"
          : "bg-transparent"
      }`}
    >
      <div data-horizontal-scroll className="flex gap-2 overflow-x-auto scrollbar-none px-4 sm:px-6 py-2.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleClick(s.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              active === s.id
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};
