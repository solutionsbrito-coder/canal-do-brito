import { friendlyAuthError } from "@/lib/authErrors";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate, Link, useLocation } from "react-router-dom";
import logo from "@/assets/canal_do_brito_logo.png";
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

const Login = () => {
  const { signIn, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isLoading && isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-background to-[hsl(var(--surface))] p-4 overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-[20%] -right-[10%] w-[55%] h-[55%] rounded-full blur-[120px] bg-primary/[0.08]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[45%] h-[45%] rounded-full blur-[100px] bg-primary/[0.06]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-1 rounded-3xl bg-primary/15 blur-2xl opacity-60" aria-hidden />

        <div className="relative space-y-6 rounded-3xl border border-white/[0.08] bg-card/90 backdrop-blur-xl p-7 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" aria-hidden />
              <img
                src={logo}
                alt="Canal do Brito"
                className="relative h-16 w-auto animate-in fade-in zoom-in duration-500"
              />
            </div>
            <div className="text-center space-y-1">
              <h1 className="font-display text-2xl font-black tracking-wider text-foreground uppercase">
                Admin Login
              </h1>
              <p className="text-xs text-muted-foreground">
                Acesso restrito à administração
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@britosolutions.tv"
                required
                maxLength={255}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-colors min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  maxLength={128}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div aria-live="assertive" aria-atomic="true">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm py-3 min-h-[48px] shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-widest">acesso restrito</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-11"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para a agenda
            </Link>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Problemas?{" "}
              <a
                href="https://wa.me/5511940759046"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Fale com o suporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
