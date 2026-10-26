import { Shield, ShieldCheck, ShieldAlert, ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FindingStatus = "resolved" | "accepted" | "monitoring";
type FindingLevel = "info" | "warn" | "error";

interface Finding {
  id: string;
  title: string;
  scanner: string;
  level: FindingLevel;
  status: FindingStatus;
  summary: string;
  action: string;
  reference?: string;
  updatedAt: string;
}

const FINDINGS: Finding[] = [
  {
    id: "supa-anon-security-definer",
    title: "Funções SECURITY DEFINER expostas ao público",
    scanner: "Supabase Linter",
    level: "warn",
    status: "resolved",
    summary:
      "Funções internas (triggers, has_role, reorder_channel_mappings, check_alias_collision) estavam acessíveis a usuários anônimos.",
    action:
      "Revogado EXECUTE de PUBLIC/anon. Apenas as RPCs de push (upsert/add/remove/remove_multiple) permanecem acessíveis a anon por design (RFC 8291).",
    reference:
      "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    updatedAt: "2026-06-19",
  },
  {
    id: "push-subscriptions-pii",
    title: "PII em push_subscriptions",
    scanner: "Supabase RLS",
    level: "warn",
    status: "resolved",
    summary:
      "A tabela push_subscriptions expunha endpoint + chaves criptográficas via SELECT público.",
    action:
      "SELECT restringido a admins (has_role). Inserções/atualizações continuam funcionando via RPC SECURITY DEFINER com validação.",
    updatedAt: "2026-06-19",
  },
  {
    id: "storage-banners-admin-update",
    title: "Storage do bucket banners sem policy UPDATE",
    scanner: "Supabase Storage",
    level: "info",
    status: "resolved",
    summary:
      "Bucket banners não tinha policy de UPDATE para admins, impedindo troca de metadata.",
    action: "Adicionada policy admin UPDATE no bucket banners.",
    updatedAt: "2026-06-19",
  },
  {
    id: "push-rpc-anon-executable",
    title: "RPCs de push executáveis por anon (intencional)",
    scanner: "Supabase Linter",
    level: "info",
    status: "accepted",
    summary:
      "upsert_push_subscription, add_push_game_id, remove_push_game_id e remove_multiple_game_ids permanecem executáveis por anon.",
    action:
      "Aceito por design: o sistema suporta assinaturas de push anônimas (RFC 8291). Entradas são validadas dentro das funções e escopadas por endpoint.",
    updatedAt: "2026-06-19",
  },
  {
    id: "has-role-security-definer",
    title: "has_role() é SECURITY DEFINER (intencional)",
    scanner: "Supabase Linter",
    level: "info",
    status: "accepted",
    summary:
      "has_role() precisa ser SECURITY DEFINER para evitar RLS recursiva em user_roles.",
    action:
      "Aceito por design. Não retorna dados sensíveis: apenas booleano baseado em auth.uid() e role.",
    updatedAt: "2026-06-19",
  },
  {
    id: "storage-public-buckets",
    title: "Buckets banners e channel-logos são públicos",
    scanner: "Supabase Storage",
    level: "info",
    status: "accepted",
    summary:
      "Os buckets banners e channel-logos permanecem públicos para leitura.",
    action:
      "Aceito por design: conteúdo é 100% público (imagens promocionais e logos de canais). Upload/update é restrito a admins.",
    updatedAt: "2026-06-19",
  },
];

const statusMeta: Record<
  FindingStatus,
  { label: string; className: string; icon: typeof Shield }
> = {
  resolved: {
    label: "Resolvido",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: ShieldCheck,
  },
  accepted: {
    label: "Aceito por design",
    className: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    icon: Shield,
  },
  monitoring: {
    label: "Em monitoramento",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: ShieldAlert,
  },
};

const levelMeta: Record<FindingLevel, { label: string; className: string }> = {
  info: { label: "Info", className: "bg-white/[0.05] text-muted-foreground border-white/10" },
  warn: { label: "Warn", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  error: { label: "Error", className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const AdminSecurity = () => {
  const counts = FINDINGS.reduce(
    (acc, f) => {
      acc[f.status] += 1;
      return acc;
    },
    { resolved: 0, accepted: 0, monitoring: 0 } as Record<FindingStatus, number>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Segurança
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Findings dos scans de segurança (Supabase Linter, RLS, Storage, Aikido/Wiz) com status atual e ações tomadas.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["resolved", "accepted", "monitoring"] as FindingStatus[]).map((key) => {
          const meta = statusMeta[key];
          const Icon = meta.icon;
          return (
            <Card
              key={key}
              className={`p-3 sm:p-4 border ${meta.className.replace("text-", "border-").split(" ")[2] ?? "border-border"} bg-white/[0.02]`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${meta.className.split(" ")[1]}`} />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{counts[key]}</div>
            </Card>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
        <p>
          Os scans automáticos rodam através das ferramentas internas do Lovable e Wiz/Aikido (quando conectados no workspace).
          Esta página consolida os findings persistentes revisados manualmente e as decisões de mitigação. Para rodar um novo scan,
          peça "rodar scan de segurança" no chat.
        </p>
      </div>

      {/* Findings list */}
      <div className="space-y-3">
        {FINDINGS.map((f) => {
          const st = statusMeta[f.status];
          const lv = levelMeta[f.level];
          const StatusIcon = st.icon;
          return (
            <Card key={f.id} className="p-4 border-border bg-white/[0.02] space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm sm:text-base text-foreground">
                    {f.title}
                  </h2>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {f.scanner} · atualizado em {f.updatedAt}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${lv.className}`}>
                    {lv.label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] flex items-center gap-1 ${st.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {st.label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Descrição
                  </div>
                  <p className="text-foreground/90">{f.summary}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Ação recomendada / tomada
                  </div>
                  <p className="text-foreground/90">{f.action}</p>
                </div>
                {f.reference && (
                  <a
                    href={f.reference}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Documentação <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSecurity;
