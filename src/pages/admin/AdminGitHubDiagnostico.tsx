import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ExternalLink, Github, RefreshCw } from "lucide-react";

type Status = "idle" | "running" | "ok" | "fail" | "warn";

type Step = {
  id: string;
  label: string;
  description: string;
  status: Status;
  detail?: string;
  durationMs?: number;
  hint?: string;
  fixUrl?: string;
  fixLabel?: string;
};

const initialSteps = (repoUrl: string): Step[] => [
  {
    id: "internet",
    label: "1. Conexão com a internet",
    description: "Verifica se o navegador consegue alcançar a internet.",
    status: "idle",
    hint: "Se falhar, o problema é a sua rede / firewall / VPN.",
  },
  {
    id: "github",
    label: "2. github.com está acessível",
    description: "Tenta carregar github.com a partir do seu navegador.",
    status: "idle",
    hint: "Se falhar, GitHub pode estar fora do ar ou bloqueado pela rede.",
    fixUrl: "https://www.githubstatus.com",
    fixLabel: "Ver status do GitHub",
  },
  {
    id: "lovable-app",
    label: "3. GitHub App da Lovable instalado",
    description: "Abre a página de instalações do GitHub para você confirmar que o app da Lovable está autorizado.",
    status: "idle",
    hint: "Se a Lovable não aparecer na lista, é preciso reinstalar o app.",
    fixUrl: "https://github.com/settings/installations",
    fixLabel: "Abrir instalações do GitHub",
  },
  {
    id: "repo",
    label: "4. Repositório do projeto responde",
    description: repoUrl
      ? `Tenta alcançar ${repoUrl}.`
      : "Informe a URL do repositório acima para testar.",
    status: "idle",
    hint: "Se falhar, o repo pode ter sido renomeado, deletado ou está privado sem acesso.",
  },
  {
    id: "lovable",
    label: "5. Plataforma Lovable",
    description: "Verifica se lovable.dev responde — necessário para o sync bidirecional.",
    status: "idle",
    fixUrl: "https://status.lovable.dev",
    fixLabel: "Ver status da Lovable",
  },
];

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "running") return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === "fail") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  return <div className="h-5 w-5 rounded-full border border-border" />;
};

const StatusBadge = ({ status }: { status: Status }) => {
  const map: Record<Status, { label: string; cls: string }> = {
    idle: { label: "Aguardando", cls: "bg-muted text-muted-foreground" },
    running: { label: "Testando…", cls: "bg-primary/15 text-primary border border-primary/30" },
    ok: { label: "OK", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
    fail: { label: "Falhou", cls: "bg-destructive/15 text-destructive border border-destructive/30" },
    warn: { label: "Atenção", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  };
  const v = map[status];
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${v.cls}`}>{v.label}</span>;
};

// Tries a fetch with timeout. CORS-blocked endpoints use no-cors and we treat
// "opaque success" as reachable. Network errors mean unreachable.
async function ping(url: string, timeoutMs = 6000): Promise<{ ok: boolean; detail: string; ms: number }> {
  const start = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(url, { method: "GET", mode: "no-cors", signal: ctrl.signal, cache: "no-store" });
    const ms = Math.round(performance.now() - start);
    return { ok: true, detail: `Resposta em ${ms}ms`, ms };
  } catch (e: any) {
    const ms = Math.round(performance.now() - start);
    const msg = e?.name === "AbortError" ? `Timeout após ${timeoutMs}ms` : (e?.message || "Falha de rede");
    return { ok: false, detail: msg, ms };
  } finally {
    clearTimeout(t);
  }
}

const AdminGitHubDiagnostico = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [steps, setSteps] = useState<Step[]>(initialSteps(""));
  const [running, setRunning] = useState(false);

  const update = (id: string, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const runAll = async () => {
    setRunning(true);
    setSteps(initialSteps(repoUrl));
    await new Promise((r) => setTimeout(r, 50));

    // 1. internet
    update("internet", { status: "running" });
    if (!navigator.onLine) {
      update("internet", { status: "fail", detail: "navigator.onLine = false" });
      setRunning(false);
      return;
    }
    const internet = await ping("https://www.cloudflare.com/cdn-cgi/trace");
    update("internet", {
      status: internet.ok ? "ok" : "fail",
      detail: internet.detail,
      durationMs: internet.ms,
    });

    // 2. github
    update("github", { status: "running" });
    const gh = await ping("https://github.com");
    update("github", {
      status: gh.ok ? "ok" : "fail",
      detail: gh.detail,
      durationMs: gh.ms,
    });

    // 3. lovable github app — can't verify install programmatically, just check the page loads
    update("lovable-app", { status: "running" });
    const app = await ping("https://github.com/apps/lovable-dev");
    update("lovable-app", {
      status: app.ok ? "warn" : "fail",
      detail: app.ok
        ? "Página do app respondeu. Confirme manualmente se está instalado para esta conta/repo."
        : app.detail,
      durationMs: app.ms,
    });

    // 4. repo
    update("repo", { status: "running" });
    if (!repoUrl.trim()) {
      update("repo", { status: "warn", detail: "Nenhuma URL informada — pulado." });
    } else {
      try {
        const u = new URL(repoUrl.trim());
        if (!u.hostname.includes("github.com")) {
          update("repo", { status: "fail", detail: "URL não é do github.com" });
        } else {
          const r = await ping(u.toString());
          update("repo", {
            status: r.ok ? "ok" : "fail",
            detail: r.ok
              ? `Repo respondeu em ${r.ms}ms (não é possível distinguir 200 de 404 por causa do CORS)`
              : r.detail,
            durationMs: r.ms,
          });
        }
      } catch {
        update("repo", { status: "fail", detail: "URL inválida" });
      }
    }

    // 5. lovable
    update("lovable", { status: "running" });
    const lov = await ping("https://lovable.dev");
    update("lovable", {
      status: lov.ok ? "ok" : "fail",
      detail: lov.detail,
      durationMs: lov.ms,
    });

    setRunning(false);
  };

  const failed = steps.filter((s) => s.status === "fail");
  const warned = steps.filter((s) => s.status === "warn");
  const allRan = steps.every((s) => s.status !== "idle" && s.status !== "running");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Github className="h-7 w-7 text-foreground" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Diagnóstico GitHub</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Roda testes automáticos no seu navegador para identificar em qual etapa a conexão com o GitHub está falhando.
          Os testes usam <code className="text-[11px] bg-muted px-1 rounded">fetch(no-cors)</code>, então só conseguem
          dizer se o servidor responde — não conseguem ler o conteúdo nem validar tokens da Lovable.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL do repositório (opcional)</CardTitle>
          <CardDescription>Cole a URL completa para testarmos se ela responde.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="https://github.com/usuario/repositorio"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={running}
          />
          <Button onClick={runAll} disabled={running} className="w-full sm:w-auto">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {running ? "Testando…" : "Rodar diagnóstico"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {steps.map((step) => (
          <Card key={step.id} className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><StatusIcon status={step.status} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{step.label}</h3>
                    <StatusBadge status={step.status} />
                    {step.durationMs !== undefined && (
                      <Badge variant="outline" className="text-[10px]">{step.durationMs}ms</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  {step.detail && (
                    <p className={`text-xs mt-2 font-mono ${step.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>
                      → {step.detail}
                    </p>
                  )}
                  {step.status === "fail" && step.hint && (
                    <p className="text-xs text-amber-400 mt-2">💡 {step.hint}</p>
                  )}
                  {step.fixUrl && (step.status === "fail" || step.status === "warn") && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="mt-3 h-8 text-xs"
                    >
                      <a href={step.fixUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        {step.fixLabel || "Abrir"}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allRan && (
        <Alert variant={failed.length ? "destructive" : "default"}>
          {failed.length ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>
            {failed.length
              ? `${failed.length} etapa(s) falharam`
              : warned.length
              ? "Testes concluídos com avisos"
              : "Tudo respondendo"}
          </AlertTitle>
          <AlertDescription className="text-xs space-y-2 mt-2">
            {failed.length > 0 ? (
              <>
                <p>A primeira falha é geralmente a causa raiz:</p>
                <p className="font-semibold">▸ {failed[0].label} — {failed[0].detail}</p>
              </>
            ) : (
              <p>
                Se mesmo assim o sync com GitHub não funciona, o problema está na camada interna da Lovable
                (token OAuth, permissões do app no repo). Vá em <strong>Connectors → GitHub</strong> e desconecte/reconecte,
                ou contate o suporte da Lovable enviando um print desta tela.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm">Limitações desta tela</AlertTitle>
        <AlertDescription className="text-xs space-y-1 mt-1">
          <p>• Não temos acesso à API interna da Lovable que gerencia o sync com GitHub.</p>
          <p>• <code>no-cors</code> impede ler o status HTTP real — só sabemos se a rede respondeu.</p>
          <p>• A instalação do GitHub App precisa ser confirmada manualmente.</p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AdminGitHubDiagnostico;
