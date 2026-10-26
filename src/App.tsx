import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { buildProgramacaoRedirect } from "@/lib/agendaRedirect";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";

// Lazy-load non-critical routes
const Login = lazy(() => import("./pages/Login"));
const Assinar = lazy(() => import("./pages/Assinar"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./pages/AdminLayout"));
import RequireAdmin from "./components/admin/RequireAdmin";
const AdminProgramacao = lazy(() => import("./pages/admin/AdminProgramacao"));
const AdminNotFound = lazy(() => import("./pages/admin/AdminNotFound"));
const AdminFilmes = lazy(() => import("./pages/admin/AdminFilmes"));
const AdminSeries = lazy(() => import("./pages/admin/AdminSeries"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/AdminConfiguracoes"));
const AdminNovidades = lazy(() => import("./pages/admin/AdminNovidades"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp"));
const AdminGitHubDiagnostico = lazy(() => import("./pages/admin/AdminGitHubDiagnostico"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminCanaisLogos = lazy(() => import("./pages/admin/AdminCanaisLogos"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const ShareRedirect = lazy(() => import("./pages/ShareRedirect"));
const AgendaRedirect = () => {
  const location = useLocation();
  const target = buildProgramacaoRedirect(location.search, location.hash);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("legacy-agenda-redirect", {
          detail: { from: `/agenda${location.search}${location.hash}`, to: target },
        })
      );
    } catch {}
  }
  return <Navigate to={target} replace />;
};
const E2EModals = lazy(() => import("./pages/E2EModals"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const SlugFallback = lazy(() => import("./components/SlugFallback"));
const UpdateAvailableBanner = lazy(() => import("./components/UpdateAvailableBanner"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}>
            <UpdateAvailableBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/programacao" element={<Index />} />
              <Route path="/filmes-e-series" element={<Index />} />
              <Route path="/agenda" element={<AgendaRedirect />} />
              <Route path="/agenda-esportiva" element={<SchedulePage />} />
              <Route path="/s/:slug" element={<ShareRedirect />} />
              <Route path="/assinar" element={<Assinar />} />
              <Route path="/login" element={<Login />} />
              {import.meta.env.DEV && (
                <Route path="/e2e/modals" element={<E2EModals />} />
              )}
              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="programacao" element={<AdminProgramacao />} />
                <Route path="filmes" element={<AdminFilmes />} />
                <Route path="series" element={<AdminSeries />} />
                <Route path="novidades" element={<AdminNovidades />} />
                <Route path="whatsapp" element={<AdminWhatsApp />} />
                <Route path="diagnostico-github" element={<AdminGitHubDiagnostico />} />
                <Route path="auditoria" element={<AdminAudit />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="configuracoes" element={<AdminConfiguracoes />} />
                <Route path="canais-logos" element={<AdminCanaisLogos />} />
                <Route path="seguranca" element={<AdminSecurity />} />
                {/* Redirects amigáveis de rotas antigas / apelidos */}
                <Route path="banners" element={<Navigate to="/admin/programacao?tab=categories" replace />} />
                <Route path="categorias" element={<Navigate to="/admin/programacao?tab=categories" replace />} />
                <Route path="jogos" element={<Navigate to="/admin/programacao" replace />} />
                <Route path="config" element={<Navigate to="/admin/configuracoes" replace />} />
                <Route path="settings" element={<Navigate to="/admin/configuracoes" replace />} />
                <Route path="github" element={<Navigate to="/admin/diagnostico-github" replace />} />
                <Route path="canais" element={<Navigate to="/admin/canais-logos" replace />} />
                <Route path="logos" element={<Navigate to="/admin/canais-logos" replace />} />
                <Route path="api-sync" element={<Navigate to="/admin/whatsapp" replace />} />
                <Route path="sync-stats" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="canais-whitelist" element={<Navigate to="/admin/canais-logos" replace />} />
                <Route path="ligas" element={<Navigate to="/admin/programacao" replace />} />
                <Route path="*" element={<AdminNotFound />} />
              </Route>
              <Route path="*" element={<SlugFallback />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
