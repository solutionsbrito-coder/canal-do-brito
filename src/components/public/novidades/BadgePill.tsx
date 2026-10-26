import { cn } from "@/lib/utils";

const BADGE_CONFIG: Record<string, { emoji: string; label: string; gradient: string; text: string; border: string; glow: string }> = {
  lancamento: {
    emoji: "🆕", label: "Lançamento",
    gradient: "from-green-600/30 to-emerald-700/20",
    text: "text-green-300", border: "border-green-500/40",
    glow: "shadow-[0_0_12px_rgba(34,197,94,0.2)]",
  },
  nova_temporada: {
    emoji: "🎞️", label: "Nova Temporada",
    gradient: "from-blue-600/30 to-blue-700/20",
    text: "text-blue-300", border: "border-blue-500/40",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.2)]",
  },
  estreia: {
    emoji: "⭐", label: "Estreia",
    gradient: "from-yellow-500/30 to-amber-600/20",
    text: "text-yellow-300", border: "border-yellow-500/40",
    glow: "shadow-[0_0_14px_rgba(234,179,8,0.25)]",
  },
  exclusivo: {
    emoji: "👑", label: "Exclusivo",
    gradient: "from-purple-600/30 to-violet-700/20",
    text: "text-purple-300", border: "border-purple-500/40",
    glow: "shadow-[0_0_12px_rgba(147,51,234,0.2)]",
  },
  novidade: {
    emoji: "🔥", label: "Novidade",
    gradient: "from-orange-600/30 to-red-700/20",
    text: "text-orange-300", border: "border-orange-500/40",
    glow: "shadow-[0_0_12px_rgba(249,115,22,0.2)]",
  },
  movie: {
    emoji: "🎬", label: "Filme",
    gradient: "from-red-600/30 to-red-700/20",
    text: "text-red-300", border: "border-red-500/40",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.2)]",
  },
  series: {
    emoji: "📺", label: "Série",
    gradient: "from-indigo-600/30 to-indigo-700/20",
    text: "text-indigo-300", border: "border-indigo-500/40",
    glow: "shadow-[0_0_12px_rgba(99,102,241,0.2)]",
  },
  tv: {
    emoji: "📺", label: "Série",
    gradient: "from-indigo-600/30 to-indigo-700/20",
    text: "text-indigo-300", border: "border-indigo-500/40",
    glow: "shadow-[0_0_12px_rgba(99,102,241,0.2)]",
  },
};

const SIZES = {
  xs: "text-[8px] px-1.5 py-0.5 gap-0.5 rounded-md",
  sm: "text-[9px] px-2 py-0.5 gap-0.5 rounded-md",
  md: "text-[10px] px-2.5 py-1 gap-1 rounded-full",
} as const;

interface BadgePillProps {
  type: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export const BadgePill = ({ type, size = "md", className }: BadgePillProps) => {
  const config = BADGE_CONFIG[type] || BADGE_CONFIG.novidade;
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold border transition-all duration-200",
        "bg-gradient-to-r",
        config.gradient,
        config.text,
        config.border,
        config.glow,
        SIZES[size],
        className,
      )}
    >
      <span className="leading-none">{config.emoji}</span>
      <span className="font-extrabold tracking-tight whitespace-nowrap">{config.label}</span>
    </span>
  );
};
