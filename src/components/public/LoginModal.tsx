import { friendlyAuthError } from "@/lib/authErrors";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { X, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal = ({ open, onClose }: LoginModalProps) => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // #08 — iOS keyboard visual viewport adjustment
  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const modal = document.getElementById("login-modal-sheet");
      if (!modal) return;
      const offset = window.innerHeight - vv.height;
      modal.style.transform = offset > 50
        ? `translateY(-${offset * 0.5}px)`
        : "translateY(0)";
    };
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      toast.success("Login realizado com sucesso!");
      onClose();
      navigate("/admin");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div id="login-modal-sheet" className="absolute bottom-0 left-0 right-0 animate-slide-up transition-transform">
        <div className="bg-surface rounded-t-2xl border-t border-border max-w-md mx-auto w-full">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="px-6 pb-8 pt-4 space-y-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-dim">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
                    <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold font-body">
                  <span className="text-foreground">Canal do</span>{" "}
                  <span className="text-primary">Brito</span>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-body">Área administrativa</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div aria-live="assertive" aria-atomic="true">
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2" role="alert">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <label htmlFor="login-modal-email" className="sr-only">E-mail</label>
              <input
                id="login-modal-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                maxLength={255}
                aria-invalid={!!error}
                className="w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground font-body focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                required
              />

              <div className="relative">
                <label htmlFor="login-modal-password" className="sr-only">Senha</label>
                <input
                  id="login-modal-password"
                  type={showPw ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  aria-invalid={!!error}
                  className="w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground font-body pr-10 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-body min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">acesso restrito</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar para a agenda
            </button>

            <p className="text-center text-[10px] text-muted-foreground font-body">
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
