# Corrigir lentidão e erros de carregamento da programação

## O que foi encontrado (verificado agora)

- O banco está **sobrecarregado de leitura/gravação em disco**: alerta de cota de disco esgotada hoje às 10:10 UTC, e até consultas simples de diagnóstico estão expirando agora.
- Quase todo o tamanho do banco (1,2 GB) vem de **registros internos das tarefas automáticas**, não dos seus dados:
  - histórico de execuções das tarefas automáticas: ~575 MB
  - respostas guardadas das chamadas internas: ~550 MB
  - registros de auditoria: ~83 MB (67 mil linhas)
  - jogos da programação: só 736 KB (25 jogos)
- Duas tarefas rodam **a cada minuto, 24h por dia** (ativar conteúdo agendado e enviar notificações). Cada uma grava registros extras a cada execução. É isso que vem gastando a cota de disco.
- Na prévia, a consulta da programação foi **cancelada pelo limite de 8 s** porque o banco não respondeu a tempo — por isso aparece erro / "Tentar novamente".
- Tabelas antigas da SportsAPI continuam existindo (vazias) e sem uso.

Conclusão: o problema principal não é a tela, é o banco gastando recursos com registros automáticos. A tela só mostra o sintoma.

## O que será feito

### 1. Aliviar o banco (efeito imediato)
- Apagar o histórico acumulado das tarefas automáticas e das respostas internas (~1,1 GB de registros sem valor).
- Criar uma limpeza diária automática desses registros, mantendo só as últimas 24 horas.
- Reduzir os registros de auditoria antigos: manter os últimos 90 dias.

### 2. Reduzir o trabalho das tarefas automáticas
- **Ativar agendados:** trocar a chamada externa por uma rotina executada direto no banco (mesma regra: ativar banners e jogos cujo horário chegou, desativar banners vencidos). Continua a cada minuto, mas sem gerar respostas guardadas nem acordar uma função externa.
- **Notificações:** passar a rodar a cada 5 minutos em vez de a cada minuto, só fazendo a chamada se existir jogo hoje com inscritos. Lembretes continuam chegando antes do jogo (janela ajustada para não perder nenhum).

### 3. Tela pública mais resistente
- Atualização em tempo real: recarregar apenas a programação afetada, uma vez por rajada de mudanças (agrupar alterações em ~1,5 s), em vez de recarregar tudo a cada alteração.
- Quando a consulta demorar, continuar mostrando a última programação salva no aparelho com um aviso discreto "Atualizando…", em vez de trocar a tela por erro.
- Tentar de novo automaticamente uma vez após 3 s antes de mostrar "Tentar novamente".

### 4. Limpeza final
- Remover as tabelas e colunas antigas da SportsAPI que ficaram vazias.

### 5. Verificação
- Medir tamanho do banco e tempo da consulta da programação antes/depois.
- Abrir a agenda no celular e no computador e confirmar carregamento rápido, sem erro.
- Rodar os testes existentes.

## Sugestões extras (não incluídas, se quiser depois)
- Painel no admin mostrando "saúde do banco" (tamanho e últimas limpezas).
- Se o problema persistir mesmo após a limpeza, aumentar a capacidade do servidor do banco (tem custo).

## Detalhes técnicos
- `TRUNCATE cron.job_run_details` e `TRUNCATE net._http_response` (liberam espaço imediato; `DELETE` deixaria inchaço).
- Novo cron diário: `delete from cron.job_run_details where end_time < now() - interval '1 day'`.
- Nova função `public.activate_scheduled_content()` (security definer) substituindo o `net.http_post` do job `activate-scheduled-content`; edge function mantida mas sem agendamento.
- Job `send-push-notifications-every-minute` reagendado para `*/5 * * * *`, janela de lembrete na função ampliada para cobrir o intervalo.
- `audit_logs`: `delete where created_at < now() - interval '90 days'` + inclusão na limpeza diária existente.
- `useRealtimeDailyGames`: invalidar só `["daily_games","all-range"]` com debounce.
- `useAllDailyGamesRange`: `placeholderData` do cache local, 1 retry com 3 s, indicador "Atualizando…" quando `isFetching` com dados.
- Drop de `sportsapi_suggestions`, `sportsapi_sync_runs` e colunas `DEPRECATED` em `daily_games` (após confirmar ausência de referências no código).
