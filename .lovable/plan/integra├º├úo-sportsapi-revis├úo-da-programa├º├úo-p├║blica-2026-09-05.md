# Integração SportsAPI + revisão da Programação pública

## Estado atual (verificado)

- A API em `sportsapi.com.br` usa base `https://sportsapi.com.br/api/v1`, header `X-API-Key` (chave `sapi_...`) e responde `{ matches, total, limit, offset }` com campos como `status` e `gameTimeDisplay`. Sem chave, responde 401 `AUTH_REQUIRED`.
- A tabela `daily_games` já tem `source`, `external_id`, `home_score`, `away_score`, `live_status`, `live_updated_at`, `elapsed_minutes`, mas os hooks públicos (`useDailyGames`, `useAllDailyGames`) filtram `source = 'manual'` — hoje qualquer jogo importado ficaria invisível. O card público calcula "ao vivo" só pelo horário e não exibe placar.
- Já existem: resolver de canais (`channelResolver`), cadastro de canais/aliases, checklist de revisão em `ProgramacaoTexto`, dedupe por `gameKey` + índice único `daily_games_unique_event`, `settings` com flag `is_secret`, cron (`pg_cron`) chamando `activate-scheduled`, auditoria via triggers.
- Não existe secret `SPORTSAPI_KEY` nem nenhuma função/serviço SportsAPI.

## O que será construído

### Fase 1 — Backend seguro (chave só no servidor)
- Pedir a chave via formulário seguro e salvar como `SPORTSAPI_KEY` (nunca no frontend/banco).
- Nova função de backend `sportsapi-sync` (admin autenticado obrigatório, validação com Zod) com ações:
  - `sports` — lista dinâmica de esportes (`GET /sports`), cache 24h em `settings`.
  - `fetch` — busca por data e esportes habilitados (`/games?sport&date&status=scheduled&limit=100`), classifica e grava em `sportsapi_suggestions`, registra `sportsapi_sync_runs`.
  - `live` — busca `status=live`, atualiza placar/relógio dos jogos já importados (`external_id`), sem criar jogos novos.
  - `import` / `ignore` / `update-existing` — ações por sugestão.
- Cliente interno `_shared/sportsapi.ts`: `getAvailableSports`, `getGamesByDate`, `getLiveGames`, `normalizeSportsApiGame`, `filterBrazilBroadcasts`, `mapSportsApiToDailyGame`, com tratamento amigável de 401 (chave inválida), 429 (cota), 404 (esporte indisponível) e timeout; limite interno de requisições (fila com no máx. ~120/min) e cache por data+esporte (10 min) para respeitar 180/min e 300k/mês.
- Cron opcional (via SQL, não migration): a cada 3 min chama `live` apenas se a configuração "atualizar placares ao vivo" estiver ativa e houver jogo importado hoje no horário de jogo; sem chamadas por usuário público.

### Fase 2 — Banco
Migration:
- `daily_games`: adicionar `external_source`, `external_sport`, `api_status`, `live_clock`, `period`, `broadcast_country`, `last_api_sync_at`, `api_payload_summary jsonb`. Reaproveitar `home_score`, `away_score`, `external_id`.
- Novas tabelas `sportsapi_sync_runs` e `sportsapi_suggestions` (campos do pedido), com GRANTs, RLS somente admin (`has_role`) e `service_role`; índice único `(external_id, sport)` em sugestões; triggers de auditoria (`log_content_change`) nas duas.
- Configurações em `settings` (não secretas): `sportsapi_enabled`, `sportsapi_mode` (manual | sugestoes | auto), `sportsapi_sports_enabled`, `sportsapi_sports_priority`, `sportsapi_brazil_only`, `sportsapi_accept_known_channel`, `sportsapi_live_updates`, `sportsapi_live_interval_min`, `sportsapi_max_per_sport`. Padrões: modo Sugestões, só com transmissão, aceitar canal reconhecido, nunca publicar automático.

### Fase 3 — Regra "somente com transmissão" e classificação
Para cada partida da API:
- sem `tvNetworks` → `ignorado_sem_transmissao`;
- país BR/Brazil/Brasil → `pronto_para_importar`;
- sem país mas canal reconhecido pelo `channelResolver` (oficial/alias/canônico) → `pronto_para_importar` com aviso "país não informado";
- canal desconhecido → `revisar` (nunca publicar automático);
- já existe na agenda (mesma data, esporte, horário ±15 min, times normalizados) → `duplicado` (permite "Atualizar dados" se a API tiver placar/status/canais melhores); dados divergentes (horário/competição/esporte) → `conflito`;
- campo obrigatório ausente → `erro`.
Horário convertido de epoch UTC para Brasília; evento único (sem adversário) mapeado sem "x"; canais gravados já normalizados pelo cadastro.

### Fase 4 — Admin: aba "Sugestões da API" dentro de Programação
- Nova sub-aba em `/admin/programacao` (rota `?tab=sportsapi`), sem mexer no fluxo de colar texto.
- Seletor de data, botões "Buscar jogos com transmissão" e "Buscar ao vivo agora", filtros por esporte e por status (Prontos / Revisar / Duplicados / Ignorados), resumo com os 6 contadores.
- Item: horário, esporte, confronto/evento, competição, status, placar, canais da API + país, canal normalizado, alerta de canal desconhecido, botões Importar / Ignorar / Associar canal (reaproveita `UnknownChannelActions`) / Ver detalhes (payload técnico).
- Importação em lote dos "Prontos" com o mesmo checklist e trava "revisei" já existentes; jogos importados entram com `source = 'sportsapi'`, `active = true` (ou `publish_at` se o admin escolher agendar).
- Vazio: "Nenhum jogo com transmissão encontrado pela SportsAPI para esta data."
- Configurações: nova seção SportsAPI em `/admin/configuracoes` com todos os toggles/listas acima (esportes habilitados vindos do `GET /sports`, padrão marcando os 13 esportes sugeridos).
- Canais: coluna/indicador "usado pela SportsAPI", aliases vindos da API, último uso e quantidade de jogos vinculados (contagem de `daily_games` cujo canal bate com nome/alias).

### Fase 5 — Público: agenda limpa e mais profissional
- Hooks `useDailyGames`/`useAllDailyGames`: aceitar `source in ('manual','sportsapi')`; no público continua valendo `active && !archived` e o filtro "só com canal válido" (jogos sem canal nunca aparecem quando vierem da API).
- `GamePremiumCard`: placar discreto quando `home_score/away_score` existirem (`Flamengo 2 x 1 Palmeiras`), linha `74' · Segundo tempo` a partir de `live_clock/period`; status ao vivo passa a priorizar `live_status`/`api_status` da API e cair para o cálculo por horário quando não houver dado; encerrados com placar final e menor destaque; futuros mantêm horário grande + "começa em X min".
- Topo compacto (`AgendaHeader`/toolbar): data, "Horário de Brasília", total publicado, total ao vivo, chips Hoje/Amanhã, busca compacta e filtros rápidos; hero ao vivo reduzido para a agenda aparecer rápido no celular.
- Estado vazio: "Nenhuma programação com transmissão confirmada para hoje." com "Ver Filmes e Séries", "Assinar" e "Ver amanhã" (se houver).
- Sem páginas novas, sem ranking, sem scroll lateral (verificado em 375px e 1280px).

### Fase 6 — WhatsApp, auditoria, testes
- WhatsApp: geradores já leem `daily_games`; apenas incluir placar e relógio quando existirem nos formatos "ao vivo" e "completa".
- Auditoria: registros de busca, encontrados, ignorados, importados, atualizados, erros da API e alteração de canal por sugestão (via triggers + inserts explícitos da função).
- Testes unitários: classificação (sem tvNetworks, BR, canal conhecido sem país, desconhecido, duplicado, conflito), mapeamento/horário, placar no card, formatos WhatsApp. Testes da função com respostas simuladas para 401/429/404. Type-check, build, Playwright mobile/desktop.

## Detalhes técnicos

- Arquivos novos: `supabase/functions/sportsapi-sync/index.ts`, `supabase/functions/_shared/sportsapi.ts`, `src/lib/sportsApi.ts` (tipos + classificador puro, testável, usado pelo admin), `src/hooks/useSportsApi.ts`, `src/components/admin/sportsapi/*` (painel, item, resumo, configurações), migration nova.
- Arquivos alterados: `useDailyGames.ts`, `GamePremiumCard.tsx`, `TimeSection.tsx`, `AgendaHeader.tsx`, `ScheduleToolbar.tsx`, `EmptyDayState.tsx`, `ProgramacaoTab.tsx`, `AdminProgramacao.tsx`, `AdminConfiguracoes.tsx`, `AdminCanaisLogos.tsx`, `whatsappFormats.ts`, `ContentHealthChecklist.tsx`, `config.toml` (nova função).
- O frontend nunca recebe a chave: chama só `supabase.functions.invoke("sportsapi-sync")` com sessão de admin; a função valida o JWT e o papel admin antes de tocar na API.
- Ordem de execução: Fase 1 (secret + função) → 2 → 3 → 4 → 5 → 6, com type-check e testes a cada fase.
