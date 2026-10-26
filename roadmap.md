# Roadmap — Refino geral Canal do Brito

- [x] Fase 1 — Menu/rotas: Banners→Programação, redirects, 404 admin, login modal
- [x] Fase 2 — Programação pública: busca, chips status/esporte/canal, ordenação, desktop grid, Horário de Brasília
- [x] Fase 3 — Canais/Logos: type + primary_color, mesclar, canal desconhecido no import
- [x] Fase 4 — Revisão antes de publicar, arquivados paginados, Filmes/Séries público + admin, Novidades agenda
- [x] Fase 5 — WhatsApp: bugs, rótulos, botões, histórico
- [x] Fase 6 — Dashboard: gráfico único, checklist saúde, ações rápidas
- [x] Fase 7 — Analytics: CTR, funil
- [x] Fase 8 — Auditoria triggers + filtros, Segurança last scan
- [x] Fase 9 — Acessibilidade/responsividade + testes (suite verde; checagem visual mobile/desktop)

## Etapa Canais (set/2026)
- [x] Regra central de normalização (`channelResolver`) usada por admin e público
- [x] Badges públicos: nome oficial, cor do canal, fallback iniciais, "+N" expansível
- [x] Admin Canais: filtros (Sem logo/Com logo/Conflitos/Inativos), busca por apelido, apelidos no cadastro, deep-link ?novo=
- [x] Importação: avisos por jogo (desconhecido / sem logo / normalizado) + ações "Criar canal" e "Apelido de…"; canais salvos já normalizados
- [x] Checklist do dashboard: canais desconhecidos, sem cadastro, sem logo, apelidos em conflito
- [x] Seed de 23 canais + apelidos
- [ ] Logo quebrada (URL externa) — só detectável no navegador; badge cai para iniciais automaticamente

- [x] Programação pública: busca (time/competição/esporte/canal/alias), status "Em breve" = tudo por começar, ordem padrão por horário (Agora/Próximos/Mais tarde/Encerrados), chips de canal com logo, +N expansível nos cards, estados vazios e analytics de filtros.

## Etapa WhatsApp (set/2026)
- [x] Formatos: Completa, Curta, Ao vivo (fallback próximos), Próximos (qtd configurável), Filmes/Séries
- [x] Prévia estilo WhatsApp, editar, restaurar padrão, link rastreado (whatsapp-*), ?date= preservado no link curto
- [x] Últimos envios: formato, aba, data, nº de jogos, acessos 7d, ver/copiar/reenviar

## Polimento final geral — concluído
- Menu admin: "Canais/Logos" → "Canais"; Diagnóstico GitHub saiu do menu (fica em Configurações › Ferramentas técnicas); rotas antigas mantidas.
- Nomenclatura: ação de exclusão padronizada como "Remover" em todo o admin; termos técnicos (payload, tab_view, shares, landings, utm_content, CTR seco) traduzidos em Auditoria, Analytics, WhatsApp e Laboratório A/B.
- Estados vazios com orientação + CTA em Filmes, Séries, Novidades, Canais, Auditoria, Histórico WhatsApp e Atividade recente do dashboard.
- Confirmação adicionada para desativação em massa (Filmes/Séries/Novidades).
- Teste novo: `src/pages/__tests__/adminRoutes.test.ts` garante que todo item do menu tem rota (sem 404) e sem nomes antigos.
- Type-check, 417 testes e build OK; sem scroll horizontal em 375/1280.

## Restauração manual e desempenho (set/2026)
- [x] SportsAPI removida; programação voltou a ser 100% manual/GPT
- [x] Programações anteriores a hoje apagadas; hoje e datas futuras preservadas
- [x] Atualizações repetidas e manutenção durante leitura pública removidas
- [x] Cache persistente de trailers
- [x] Validação final


## Polimento completo — set/2026
- [x] Publicação comparativa e rascunho recuperável
- [x] Histórico de versões e restauração
- [x] Carregamento público progressivo, atualização e preferências
- [x] Central de pendências e diagnóstico administrativo
- [x] Limpeza diária segura com auditoria
- [x] Acessibilidade, responsividade e testes finais

## Correção do carregamento da agenda — set/2026
- [x] Reutilizar a mesma consulta da agenda no cabeçalho, eliminando leitura duplicada
- [x] Mostrar a última agenda válida imediatamente enquanto a atualização ocorre
- [x] Encerrar consultas lentas com erro recuperável, sem esqueleto infinito
- [x] Remover da agenda a consulta inexistente de progresso e sua repetição a cada 30 segundos
