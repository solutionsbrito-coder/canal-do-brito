import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Film,
  Clapperboard,
  Settings,
  ExternalLink,
  Sparkles,
  MessageCircle,
  Github,
  ScrollText,
  BarChart3,
  Tv,
  Shield,
  Menu,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/canal_do_brito_logo.png";

// ============================================================================
// Nav model — grouped by section
// ============================================================================
type AdminTab = {
  value: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  group: "content" | "ops" | "system";
  /** Oculto dos menus (continua acessível pela rota) */
  hidden?: boolean;
};

export const adminTabs: AdminTab[] = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard", color: "text-foreground", activeBg: "bg-white/[0.08]", activeBorder: "border-b-white", group: "content" },
  { value: "programacao", label: "Programação", icon: CalendarDays, path: "/admin/programacao", color: "text-emerald-400", activeBg: "bg-emerald-500/[0.08]", activeBorder: "border-b-emerald-400", group: "content" },
  { value: "canais-logos", label: "Canais", icon: Tv, path: "/admin/canais-logos", color: "text-pink-400", activeBg: "bg-pink-500/[0.08]", activeBorder: "border-b-pink-400", group: "content" },
  { value: "filmes", label: "Filmes", icon: Film, path: "/admin/filmes", color: "text-blue-400", activeBg: "bg-blue-500/[0.08]", activeBorder: "border-b-blue-400", group: "content" },
  { value: "series", label: "Séries", icon: Clapperboard, path: "/admin/series", color: "text-purple-400", activeBg: "bg-purple-500/[0.08]", activeBorder: "border-b-purple-400", group: "content" },
  { value: "novidades", label: "Novidades", icon: Sparkles, path: "/admin/novidades", color: "text-amber-400", activeBg: "bg-amber-500/[0.08]", activeBorder: "border-b-amber-400", group: "content" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, path: "/admin/whatsapp", color: "text-emerald-400", activeBg: "bg-emerald-500/[0.08]", activeBorder: "border-b-emerald-400", group: "ops" },
  { value: "analytics", label: "Analytics", icon: BarChart3, path: "/admin/analytics", color: "text-cyan-400", activeBg: "bg-cyan-500/[0.08]", activeBorder: "border-b-cyan-400", group: "system" },
  { value: "auditoria", label: "Auditoria", icon: ScrollText, path: "/admin/auditoria", color: "text-orange-400", activeBg: "bg-orange-500/[0.08]", activeBorder: "border-b-orange-400", group: "system" },
  { value: "seguranca", label: "Segurança", icon: Shield, path: "/admin/seguranca", color: "text-red-400", activeBg: "bg-red-500/[0.08]", activeBorder: "border-b-red-400", group: "system" },
  { value: "configuracoes", label: "Configurações", icon: Settings, path: "/admin/configuracoes", color: "text-muted-foreground", activeBg: "bg-white/[0.06]", activeBorder: "border-b-muted-foreground", group: "system" },
  // Ferramenta técnica: acessível via Configurações → Ferramentas (não aparece no menu principal)
  { value: "diagnostico-github", label: "Diagnóstico GitHub", icon: Github, path: "/admin/diagnostico-github", color: "text-sky-400", activeBg: "bg-sky-500/[0.08]", activeBorder: "border-b-sky-400", group: "system", hidden: true },
];

const groupLabels: Record<AdminTab["group"], string> = {
  content: "Conteúdo",
  ops: "Operação",
  system: "Sistema",
};

// Primary tabs visible on desktop nav (rest goes into a "Mais" menu)
const PRIMARY_DESKTOP: string[] = [
  "dashboard",
  "programacao",
  "canais-logos",
  "filmes",
  "series",
  "novidades",
  "whatsapp",
];

const AdminLayout = () => {
  const { isAdmin, isLoading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTab = useMemo(
    () => adminTabs.find((t) => location.pathname.startsWith(t.path)),
    [location.pathname]
  );
  const currentValue = currentTab?.value || "dashboard";

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/login" replace />;

  const primaryTabs = adminTabs.filter((t) => PRIMARY_DESKTOP.includes(t.value) && !t.hidden);
  const overflowTabs = adminTabs.filter((t) => !PRIMARY_DESKTOP.includes(t.value) && !t.hidden);
  const overflowActive = overflowTabs.some((t) => t.value === currentValue);

  const goTo = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <div
      className="admin-scrollbar relative min-h-dvh bg-gradient-to-b from-background to-[hsl(var(--surface))]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Ambient Blobs + Grain */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="atm-blob absolute -right-[10%] -top-[10%] h-[40%] w-[40%] animate-blob-a rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="atm-blob absolute -bottom-[10%] -left-[10%] h-[35%] w-[35%] animate-blob-b rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="grain-overlay" />
      </div>

      {/* Header */}
      <header className="glow-primary-subtle sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
          {/* Left cluster */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Mobile drawer trigger */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="min-h-11 min-w-11 lg:hidden"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] border-r border-white/[0.06] bg-background p-0">
                <SheetHeader className="border-b border-white/[0.06] p-4 text-left">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="Canal do Brito" className="h-8 w-auto" />
                    <SheetTitle className="font-display text-base">Admin</SheetTitle>
                    <span className="rounded-md border border-primary/30 bg-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                      PRO
                    </span>
                  </div>
                  <SheetDescription className="text-[11px] text-muted-foreground">
                    Navegue entre as áreas administrativas
                  </SheetDescription>
                </SheetHeader>
                <nav
                  className="flex flex-col gap-4 overflow-y-auto p-3"
                  style={{ maxHeight: "calc(100dvh - 120px)" }}
                  aria-label="Menu do painel admin"
                >
                  {(["content", "ops", "system"] as const).map((group) => (
                    <div key={group}>
                      <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        {groupLabels[group]}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {adminTabs
                          .filter((t) => t.group === group && !t.hidden)
                          .map((tab) => {
                            const isActive = currentValue === tab.value;
                            return (
                              <button
                                key={tab.value}
                                onClick={() => goTo(tab.path)}
                                aria-current={isActive ? "page" : undefined}
                                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  isActive
                                    ? `${tab.activeBg} ${tab.color}`
                                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                                }`}
                              >
                                <tab.icon className={`h-4 w-4 ${isActive ? tab.color : ""}`} aria-hidden />
                                <span>{tab.label}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <img src={logo} alt="Canal do Brito" className="h-8 w-auto sm:h-10" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-display text-sm font-bold text-foreground">Admin</span>
              <span className="rounded-md border border-primary/30 bg-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                PRO
              </span>
            </div>
            {/* Active tab pill (visible on all sizes as a breadcrumb-style cue) */}
            {currentTab && (
              <div className="ml-1 flex min-w-0 items-center gap-1.5 text-xs sm:ml-3">
                <span className="text-muted-foreground/60" aria-hidden>
                  /
                </span>
                <currentTab.icon className={`h-3.5 w-3.5 shrink-0 ${currentTab.color}`} aria-hidden />
                <span className={`truncate font-semibold ${currentTab.color}`}>{currentTab.label}</span>
              </div>
            )}
          </div>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="h-9 min-h-11 gap-1 border-primary/30 px-2 text-[11px] text-primary hover:bg-primary/10 hover:text-primary sm:px-3"
              aria-label="Ver site público"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Site</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="min-h-11 min-w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sair da conta"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop tab bar — hidden on mobile (drawer handles it) */}
        <div className="mx-auto hidden max-w-7xl px-2 sm:px-6 lg:block">
          <nav className="-mb-px flex items-end gap-0.5" aria-label="Navegação do painel admin">
            {primaryTabs.map((tab) => {
              const isActive = currentValue === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => navigate(tab.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-all sm:px-4 ${
                    isActive
                      ? `${tab.activeBg} ${tab.activeBorder} ${tab.color}`
                      : "border-b-transparent text-muted-foreground/70 hover:bg-white/[0.03] hover:text-foreground"
                  }`}
                >
                  <tab.icon className={`h-4 w-4 ${isActive ? tab.color : ""}`} aria-hidden />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Overflow "Mais" menu on desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex min-h-11 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-all ${
                    overflowActive
                      ? "border-b-primary bg-primary/10 text-primary"
                      : "border-b-transparent text-muted-foreground/70 hover:bg-white/[0.03] hover:text-foreground"
                  }`}
                  aria-label="Mais opções do menu"
                  aria-haspopup="menu"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  <span>Mais</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Sistema
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {overflowTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onSelect={() => navigate(tab.path)}
                    className={`cursor-pointer gap-2 ${currentValue === tab.value ? tab.color : ""}`}
                  >
                    <tab.icon className="h-4 w-4" aria-hidden />
                    <span>{tab.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main
        id="admin-main"
        className="relative z-10 mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
