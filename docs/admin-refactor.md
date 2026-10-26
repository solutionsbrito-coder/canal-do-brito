# Admin Panel Refactor — Decisões e Padrões

Documento consolidando as 7 fases da reforma do painel administrativo (Brito Solutions).
Serve como referência para novas telas e revisões futuras.

---

## Princípios gerais

- **Mobile-first**: todas as telas foram projetadas para 320–430px primeiro e depois adaptadas para desktop.
- **Touch targets ≥ 44px**: botões, chips, inputs e tabs usam `min-h-11` (44px) ou `h-11` no mínimo.
- **Tipografia hierárquica**:
  - Headers de página: `font-display` (Bebas Neue), `text-xl` a `text-2xl`.
  - Rótulos e metadados: `text-[11px] uppercase tracking-wider text-muted-foreground`.
  - Corpo: `text-sm` (Syne / system body).
- **Glassmorphism consistente**: `glass-panel rounded-xl` com bordas `border-white/[0.06–0.1]`.
- **Cores semânticas**: tokens do design system (`primary`, `emerald-400`, `sky-400`, `amber-400`, `red-400`). Nunca hex hardcoded em componentes.
- **Acessibilidade**: `aria-label`, `aria-pressed`, `aria-expanded`, `aria-live` em estados dinâmicos; foco visível via ring padrão do Tailwind.
- **Safe areas iOS**: `env(safe-area-inset-bottom)` respeitado em barras fixas.

---

## Fase 1 — Fundação (Layout & primitives)

Arquivos: `src/pages/AdminLayout.tsx`, `src/components/admin/AdminPageHeader.tsx`, `src/components/admin/AdminStates.tsx`.

- **AdminLayout** responsivo: drawer no mobile, tabs horizontais no desktop.
- **AdminPageHeader** unifica título + descrição + ações.
- **AdminStates** centraliza estados de loading, empty e error com shimmer padrão.

---

## Fase 2 — Dashboard

Arquivo: `src/pages/admin/AdminDashboard.tsx`.

- Timezone travado em `America/Sao_Paulo` via `Intl.DateTimeFormat` — evita bugs em datas do dia.
- Cards de KPI com ícones semânticos e cor por status.
- Textos secundários padronizados em `text-[11px]`.

---

## Fase 3 — Banners

Arquivo: `src/pages/admin/AdminBanners.tsx`.

- Drag-and-drop escopado por grupo (`publish_at`).
- Multi-seleção limpa automaticamente ao mudar de aba/filtro.
- Prompt-modelo exposto via `Popover` com botão de copiar.
- Alertas de banners expirados via `<ExpiredBannersAlert />`.
- Recorrência configurável (repetir a cada N dias).
- `BannerHealthPanel` mostra cobertura por categoria; `BannerPreviewModal` mostra preview do usuário.

Backend:
- `useBanners` filtra `expires_at` e `publish_at`.
- `activate-scheduled` também desativa banners expirados.

---

## Fase 4 — Conteúdo (Filmes / Séries / Novidades)

Arquivos: `src/pages/admin/AdminFilmes.tsx`, `AdminSeries.tsx`, `AdminNovidades.tsx`.

- Grid de stats (Total, Ativos, Incompletos, média) com cores por rating.
- Buscas TMDB com tabs padronizadas e feedback "✓ Já adicionada".
- Inputs `h-11`, botão de limpar busca, `glass-panel` unificado.
- Detecção de itens incompletos (sem gênero/backdrop) para curadoria rápida.

---

## Fase 5 — WhatsApp & Programação

Arquivos: `src/lib/whatsappText.ts`, `src/pages/admin/AdminWhatsApp.tsx`, `src/components/admin/ProgramacaoTexto.tsx`, `src/lib/gameUtils.ts`.

- `buildDayText` embute a data no link: `/programacao?date=YYYY-MM-DD` — resolve perda de contexto ao compartilhar.
- `openWhatsApp` copia o texto para o clipboard automaticamente se o popup for bloqueado.
- Parser reconhece 14 esportes com prioridade por emoji → header → regex.
- `explodeSingleLineEvents` quebra saídas compactas do LLM em jogos individuais.
- Placeholders ("Nenhum jogo identificado" etc.) são filtrados antes de persistir.

---

## Fase 6 — Configurações

Arquivo: `src/pages/admin/AdminConfiguracoes.tsx`.

- Inputs `h-11`, `inputMode` semântico (numeric para WhatsApp, url para site).
- API keys com `type="password"` + `autoComplete="off"`.
- Editor JSON de canais com botão "Padrão" para restaurar preset.
- Botão salvar desabilitado quando não há alterações (`isDirty`).
- `aria-live` para feedback de sucesso.

---

## Fase 7 — Analytics / Audit / Security

Arquivos: `src/pages/admin/AdminAnalytics.tsx`, `AdminAudit.tsx`, `AdminSecurity.tsx`.

- **Analytics**: filtros de período com `aria-pressed`, grid responsivo, botões `min-h-11`.
- **Audit**: `aria-expanded` no toggle de payload JSON, search/filters `min-h-11`, textos `text-[11px]`.
- **Security**: página dedicada listando findings (Supabase Linter, RLS, Storage, Wiz/Aikido) com status (resolvido / aceito por design / em monitoramento) e ação tomada. Grid de sumário empilha no mobile.

---

## Segurança (referência)

Findings tratados no scan de 2026-06-19:

| ID | Ação |
|---|---|
| `supa-anon-security-definer` | REVOKE EXECUTE em funções internas |
| `push-subscriptions-pii` | SELECT restrito a admin |
| `storage-banners-admin-update` | Policy UPDATE admin adicionada |
| `push-rpc-anon-executable` | Aceito por design (RFC 8291) |
| `has-role-security-definer` | Aceito por design (evita recursão de RLS) |
| `storage-public-buckets` | Aceito por design (conteúdo público) |

---

## Convenções para novas telas admin

1. Envolver com `AdminPageHeader` + `glass-panel rounded-xl` nos cartões.
2. Usar `text-[11px] uppercase tracking-wider` para rótulos.
3. `min-h-11` em qualquer elemento clicável.
4. Estados via `AdminStates` (Loading/Empty/Error) — nunca strings soltas.
5. Ao criar tabelas novas: incluir `GRANT` + RLS + policies com `has_role()` na mesma migration.
6. Timezone sempre `America/Sao_Paulo` (usar helpers de `src/lib/dateUtils.ts`).
7. Datas em links de compartilhamento embutidas via querystring, não implícitas.
