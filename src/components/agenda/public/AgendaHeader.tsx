import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logo from "@/assets/canal_do_brito_logo.png";
import { midnightInSaoPaulo } from "@/lib/gameUtils";

interface Props {
  date: string;
  today: string;
  totalGames: number;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

export const AgendaHeader = ({ date, today, totalGames, onPrev, onToday, onNext }: Props) => {
  const dateObj = midnightInSaoPaulo(date);
  const isToday = date === today;
  const weekday = format(dateObj, "EEEE", { locale: ptBR }).toUpperCase();
  const dayMonth = format(dateObj, "dd 'DE' MMM", { locale: ptBR }).toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5"
      style={{
        background: "linear-gradient(180deg, rgba(7,8,10,0.92) 0%, rgba(7,8,10,0.78) 100%)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto w-full max-w-[460px] px-4 py-2.5 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Voltar para o app">
          <img src={logo} alt="Canal do Brito" className="h-9 w-9 rounded-lg object-cover" />
          <div className="leading-tight min-w-0">
            <p
              className="text-[13px] tracking-wider truncate"
              style={{ fontFamily: "Bebas Neue, sans-serif", color: "#00ff87" }}
            >
              {isToday ? "HOJE" : weekday} · {dayMonth}
            </p>
            <p className="text-[10px] text-white/55 font-medium leading-none">
              {totalGames} {totalGames === 1 ? "jogo" : "jogos"}
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 bg-white/5 rounded-full p-1 border border-white/10 shrink-0">
          <button
            onClick={onPrev}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onToday}
            className="text-[11px] px-2.5 h-8 rounded-full hover:bg-white/10 transition font-bold uppercase tracking-wider"
            aria-label="Voltar para hoje"
          >
            {isToday ? "Hoje" : format(dateObj, "dd/MM")}
          </button>
          <button
            onClick={onNext}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};
