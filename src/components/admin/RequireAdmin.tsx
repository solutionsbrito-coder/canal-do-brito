import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface RequireAdminProps {
  children: ReactNode;
}

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const { session, user, isAdmin, isLoading, roleChecked, recheckAdmin, signOut } = useAuth();
  const location = useLocation();
  const warned = useRef(false);
  const [rechecking, setRechecking] = useState(false);

  const stillResolving = isLoading || (session && !roleChecked);

  useEffect(() => {
    if (!stillResolving && session && !isAdmin && !warned.current) {
      warned.current = true;
      toast.error("Acesso negado", {
        description: "Sua conta não possui permissão de administrador.",
      });
    }
  }, [stillResolving, session, isAdmin]);

  if (stillResolving) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[100dvh] items-center justify-center bg-background"
      >
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        <span className="sr-only">Verificando permissões…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!isAdmin) {
    const handleRetry = async () => {
      setRechecking(true);
      try {
        await recheckAdmin();
      } finally {
        setRechecking(false);
      }
    };

    const handleSwitch = async () => {
      await signOut();
      window.location.assign("/login");
    };

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden />
          </div>
          <h1 className="font-display text-2xl tracking-wider text-foreground">
            Acesso restrito
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua conta está autenticada, mas não possui o papel de
            administrador necessário para acessar esta área.
          </p>
          {user?.email && (
            <p className="text-xs text-muted-foreground/80">
              Conta logada:{" "}
              <span className="font-mono text-foreground/90">{user.email}</span>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={rechecking}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${rechecking ? "animate-spin" : ""}`}
                aria-hidden
              />
              {rechecking ? "Verificando…" : "Tentar novamente"}
            </button>
            <a
              href="/"
              className="min-h-[44px] inline-flex items-center justify-center px-4 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-white/[0.04] transition"
            >
              Voltar ao site
            </a>
            <button
              type="button"
              onClick={handleSwitch}
              className="min-h-[44px] inline-flex items-center justify-center px-4 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-white/[0.04] transition"
            >
              Trocar de conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAdmin;
