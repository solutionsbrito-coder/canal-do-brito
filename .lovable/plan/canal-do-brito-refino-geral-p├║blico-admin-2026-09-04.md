# Canal do Brito — Refino geral (público + admin)

Plano completo em 9 fases, executadas em sequência na ordem de prioridade que você definiu. O fluxo atual (X/Twitter → GPT → colar no admin → processar → publicar) é mantido; nada de páginas públicas por esporte/canal, ranking ou portal de notícias.

## Diagnóstico confirmado no código e no banco

- A rota `/admin/banners` (rótulo "Banners") contém duas sub-abas: banners de imagem e a Programação (colar texto, jogos publicados, arquivados). Não existe rota `/admin/programacao`.
- Rotas `/admin/github`, `/admin/config`, `/admin/settings`, `/admin/categorias` não existem (as reais são `/admin/diagnostico-github` e `/admin/configuracoes`). `/admin/canais` redireciona para WhatsApp em vez de Canais/Logos. No desktop, "Canais" fica escondido no menu "Mais".
- WhatsApp: "atualizado há 29804788min" vem de calcular o tempo a partir do valor 0 antes da primeira carga; "0 jogo(s)" ocorre porque a contagem só considera jogos com origem "manual" na data selecionada. Botões mostram os textos técnicos `schedule` / `novidades`.
- Analytics: CTR = visitantes / compartilhamentos, sem teto — passa de 100% quando um link compartilhado é aberto por várias pessoas.
- Auditoria: hoje só a exclusão de jogos gera registro (gatilho no banco). Edições, publicações, importações, canais, filmes e séries não são auditados. Não há filtro por usuário.
- Segurança: página 100% estática, data fixa "2026-06-19".
- Arquivados: 902 jogos carregados de uma vez, sem paginação nem busca (só filtro por data).
- Programação pública: sem busca, sem filtros Em breve/Encerrados, sem ordenação por horário, sem "Horário de Brasília", largura fixa de 460px (grande área vazia no desktop).
- Filmes & Séries: o destaque continua girando com o modal de detalhes/trailer aberto. "Séries da Semana" já lê só da tabela de séries (não mostra filmes) — mantido.
- Canais: cadastro tem nome, apelidos, logo, sigla, ativo — falta tipo (TV aberta/streaming...) e cor principal; não há "mesclar" explícito (só vincular como apelido).
- Preview antes de publicar já existe com alertas de "sem canal", "sem competição" e horário de madrugada; falta: canal desconhecido, esporte suspeito, duplicado no texto x banco destacado, "x" indevido em evento único, data do texto ≠ data selecionada.

## Fase 1 — Programação no lugar certo (menu e rotas)
- Renomear "Banners" → "Programação" no menu; rota nova `/admin/programacao` (a antiga `/admin/banners` redireciona). Sub-aba "Programação" passa a ser a padrão; "Banners de imagem" fica como segunda sub-aba.
- Menu desktop principal: Dashboard, Programação, Canais/Logos, Filmes, Séries, Novidades, WhatsApp. "Mais": Analytics, Auditoria, Segurança, Config, GitHub.
- Redirecionamentos amigáveis para `/admin/config`, `/admin/settings`, `/admin/github`, `/admin/canais`, `/admin/categorias` (→ Programação/Banners). Página 404 do admin com link de volta.
- Login: manter o que já existe (mostrar senha, loading, erro) e adicionar link "Voltar para a agenda" também no modal, mensagens de erro específicas (e-mail/senha inválidos vs. sem conexão) e rótulos acessíveis.

## Fase 2 — Programação pública (aba Programação)
Na mesma tela, sem novas páginas:
- Barra de busca (time, competição ou canal) + chips horizontais: status (Todos / Ao vivo / Em breve / Encerrados), esporte, canal; alternador "Por esporte / Por horário". Filtros persistem só durante a sessão.
- Cards: horário e canais maiores, hierarquia clara (jogo → competição → canais), menos texto miúdo; evento único sem "x" e com título em uma linha ("US Open — Todas as Quadras"); "x" só quando há dois lados. Detecção de evento único também por texto (etapa, todas as quadras, GP, round) além do esporte.
- Ao vivo e "começa em até 60 min" ganham faixa destacada no topo da lista.
- Rodapé discreto "Horários de Brasília (GMT-3)".
- Desktop: container até ~1100px com grade de 2–3 colunas a partir de 768px; mobile intacto.
- Estado vazio melhorado (mensagem + atalho para Filmes & Séries) e dedup visual por chave (data + times + horário) como rede de segurança.

## Fase 3 — Canais e Logos
- Banco: adicionar `type` (tv_aberta, tv_fechada, streaming, youtube, ppv, outro) e `primary_color` ao cadastro de canais.
- Admin: formulário com tipo, cor e preview do badge público ao vivo; ação "Mesclar" (move apelidos e regrava jogos que usam o nome duplicado); lista "Sem logo" ordenada por uso; ao colar URL de logo, baixar e salvar no armazenamento próprio (sem depender de imagem externa).
- Importação da programação: normalizar canais pelos apelidos cadastrados; canal não reconhecido gera alerta "Canal desconhecido" no preview com atalho para cadastrar.

## Fase 4 — Publicação com revisão + Filmes/Séries
Programação admin:
- Etapa de revisão obrigatória quando houver alertas: resumo (qtd. de jogos, esportes, canais) + lista com alertas: duplicado, sem horário, sem canal, canal desconhecido, sem competição, esporte suspeito, "x" indevido, texto sem data, data do texto ≠ data selecionada. Sem alertas → publicação em um clique.
- Edição inline no preview (horário, esporte, competição, canais) antes de salvar.
- Arquivados: busca, paginação por data (carrega 30 por vez) e "Restaurar dia inteiro".
Filmes & Séries público:
- Destaque pausa enquanto modal de detalhes/trailer estiver aberto.
- Modal de detalhes: nota, ano, gênero, duração/temporadas e descrição em blocos organizados; botões "Ver detalhes" e "Assistir trailer" padronizados; fallback de pôster.
Filmes/Séries/Novidades admin:
- Card clicável para editar + botão explícito; indicadores de qualidade (pôster, backdrop, trailer, gênero, descrição); confirmação para remover; data de adição; ordenação manual/nota/ano/data/popularidade; séries mostram temporadas e status.
- Novidades: exigir tipo e gênero para ativar (ou alerta); campos "entra em / sai em" (banco: `publish_at`, `expires_at`); aviso se o título já está em Filmes/Séries.

## Fase 5 — WhatsApp
- Corrigir "atualizado há" (ignorar valor 0) e contagem de jogos (mesma fonte que a aba pública).
- Rótulos amigáveis (Programação / Filmes & Séries), data selecionada visível, preview final antes de copiar/enviar.
- Botões: Gerar texto curto, Gerar texto completo, Copiar programação de hoje, Copiar só ao vivo, Copiar próximos jogos.
- Histórico de mensagens copiadas/enviadas (tabela nova `whatsapp_messages`, só admin) com contagem de cliques por campanha via eventos já existentes.

## Fase 6 — Dashboard
- Substituir "Ativo vs Inativo" duplicado por um único gráfico de barras + números.
- "Saúde do Conteúdo" vira checklist acionável: sem gênero, canal sem logo, canal desconhecido, jogo duplicado, sem horário, sem canal, esporte suspeito, sem pôster, sem trailer — cada item leva à tela certa já filtrada.
- Ações rápidas do dia: Colar programação, Compartilhar no WhatsApp, Canais sem logo. Mostrar última atualização e status da publicação do dia (quantos jogos publicados/agendados).

## Fase 7 — Analytics
- CTR limitado e explicado; métricas separadas: compartilhamentos, cliques, sessões, visitantes únicos.
- Funil simples: copiar/enviar → clique no link → visita na aba → clique em conteúdo. Nomes de campanha legíveis; tabelas técnicas recolhidas em "Detalhes"; CSV mantido.

## Fase 8 — Auditoria e Segurança
- Auditoria: registrar criação/edição/exclusão/desativação/restauração de jogos, importação por texto, leitura por imagem, normalização IA, alteração de canal/logo, edição de filme/série/novidade, cópia/envio WhatsApp, atualização TMDB (gatilhos no banco + registros do app). Login/logout ficam de fora, conforme combinado. Filtro por usuário (e-mail via tabela de perfis mínima) e por entidade; payload em modal organizado com campos sensíveis ocultos.
- Segurança: data do último scan e status lidos de uma configuração salva ao rodar o scan; separação clara entre risco real, resolvido e aceito por design; botão "Solicitar nova verificação".

## Fase 9 — Responsividade, acessibilidade e acabamento
- Revisão de contraste de textos pequenos (mínimo 12px em corpo), espaçamentos, foco visível, aria-labels, ações perigosas afastadas das principais, largura melhor aproveitada no desktop em todo o admin.
- Testes automatizados atualizados (parser, hooks, páginas admin) e verificação visual em 375px e 1280px.

## Detalhes técnicos
- Migrações: `channel_logo_mappings` (+type, +primary_color), `news_releases` (+publish_at, +expires_at), nova `whatsapp_messages`, `profiles` mínima (id, email) preenchida por gatilho para exibir autor na auditoria, gatilhos de auditoria em `daily_games` (insert/update), `channel_logo_mappings`, `featured_movies`, `featured_series`, `news_releases`, setting `security_last_scan`. Todas com GRANT + RLS via `has_role()`.
- Frontend: `AdminLayout` (menu/rotas), `AdminBanners` → `AdminProgramacao`, `ProgramacaoTab` + novos `ScheduleSearchBar`/`StatusChips`, `GameCard`/`GamePremiumCard`, `ArchivedGamesManager` paginado, `ProgramacaoTexto` (revisão + alertas), `AdminCanaisLogos`, `CinemaHero` (pausa via prop), `ContentDetailSheet`, `AdminWhatsApp`, `AdminAnalytics`, `AdminDashboard`, `AdminAudit`, `AdminSecurity`.
- Timezone sempre `America/Sao_Paulo`; tokens de cor do design system; alvos de toque ≥ 44px.
