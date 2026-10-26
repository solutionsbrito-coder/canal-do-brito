import { Link, useLocation } from "react-router-dom";
import { Compass, LayoutDashboard, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminNotFound = () => {
  const { pathname } = useLocation();
  return (
    <div className="glass-panel rounded-2xl p-8 text-center max-w-lg mx-auto mt-8">
      <Compass className="h-10 w-10 mx-auto text-muted-foreground/60" aria-hidden />
      <h1 className="font-display text-2xl mt-4 text-foreground">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground mt-2">
        A tela <code className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">{pathname}</code> não existe no painel.
        Use o menu acima para navegar.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-6">
        <Button asChild variant="outline" className="min-h-11 gap-2">
          <Link to="/admin/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
        </Button>
        <Button asChild className="min-h-11 gap-2">
          <Link to="/admin/programacao"><CalendarDays className="h-4 w-4" /> Programação</Link>
        </Button>
      </div>
    </div>
  );
};

export default AdminNotFound;
