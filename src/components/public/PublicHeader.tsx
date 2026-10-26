import logo from "@/assets/canal_do_brito_logo.png";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const PublicHeader = () => {
  const today = new Date();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/5 shadow-[0_1px_3px_hsl(0,0%,0%,0.4)]">
      <div className="flex items-center justify-between px-4 py-2 sm:px-6 sm:py-2.5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Canal do Brito" className="h-8 sm:h-11 w-auto" />
          <div className="leading-tight">
            <h1 className="font-body text-sm sm:text-base font-bold text-foreground tracking-tight">
              <span className="text-foreground">Canal do</span>{" "}
              <span className="text-primary">Brito</span>
            </h1>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground/50 capitalize font-medium">
              {format(today, "EEEE, d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
