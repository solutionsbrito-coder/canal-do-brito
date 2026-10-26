import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CHIPS = ["Esportes ao vivo", "Filmes", "Séries", "NBA", "Futebol"];

interface PremiumCTAProps {
  from?: string;
}

export const PremiumCTA = ({ from }: PremiumCTAProps) => {
  const href = from ? `/assinar?from=${from}` : "/assinar";

  return (
    <div className="px-4">
      <div
        className="relative overflow-hidden rounded-3xl border border-primary/20 p-5 sm:p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{
          background:
            "linear-gradient(160deg, #0d0f12 0%, #0a0b0e 55%, #0d0f12 100%)",
        }}
      >
        {/* Glow superior direito discreto */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl"
        />
        {/* Linha de luz no topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        <div className="relative space-y-4">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            <p className="font-body text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary/85">
              Plano Premium · R$ 35/mês
            </p>
          </div>

          {/* Título */}
          <h3
            className="text-foreground leading-[0.95]"
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: "clamp(28px, 7vw, 40px)",
              letterSpacing: "0.01em",
            }}
          >
            ASSISTA TUDO{" "}
            <span className="text-primary">SEM LIMITES</span>
          </h3>

          {/* Subcopy */}
          <p className="font-body text-[13px] leading-snug text-foreground/65">
            Esportes ao vivo, filmes e séries em um só lugar — sem travar, sem
            burocracia.
          </p>

          {/* Chips */}
          <ul className="flex flex-wrap gap-1.5">
            {CHIPS.map((label) => (
              <li
                key={label}
                className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 font-body text-[11px] text-foreground/80"
              >
                {label}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            to={href}
            aria-label="Assinar agora o Canal do Brito"
            className="group relative mt-1 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-7 text-primary-foreground shadow-[0_14px_40px_-14px_hsl(var(--primary)/0.65)] transition-all hover:opacity-95 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ minHeight: 52 }}
          >
            {/* Shimmer */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 motion-reduce:hidden"
              style={{
                background:
                  "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)",
              }}
              animate={{ x: ["0%", "420%"] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 4,
                ease: "easeInOut",
              }}
            />
            <span
              className="relative font-bold tracking-wide"
              style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 19 }}
            >
              ASSINAR AGORA
            </span>
            <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Trust line */}
          <p className="text-center font-body text-[10.5px] text-foreground/50">
            Pix · Sem fidelidade · Cancele quando quiser
          </p>
        </div>
      </div>
    </div>
  );
};
