# Restaurar a programação manual e acelerar o carregamento

## Estado atual verificado

- A integração está gerando carga excessiva: o banco mantém um agendamento `sportsapi-cron` ativo a cada minuto, com 11.518 execuções e 21.890 sugestões armazenadas.
- As consultas da SportsAPI ocupam os primeiros lugares entre as operações mais lentas do banco; uma delas já foi chamada 45.768 vezes.
- Não existem jogos publicados com origem SportsAPI neste momento: os 1.080 jogos existentes são manuais. Porém, 268 jogos manuais receberam placar/status/metadados da API e precisam ser limpos para voltar ao comportamento anterior.
- A limpeza de histórico seguirá a decisão confirmada: manter a programação de hoje e todas as datas futuras; apagar definitivamente os jogos de datas anteriores, inclusive arquivados.
- A tela pública também consulta hoje e amanhã continuamente, a cada 30 segundos, apesar de já existir atualização em tempo real. Isso cria tráfego duplicado desnecessário.
- O catálogo faz várias consultas individuais para descobrir trailers; o resultado só fica em memória e é perdido ao recarregar a página.

## O que será feito

### 1. Desligar e remover a SportsAPI

- Desativar primeiro o agendamento automático para interromper novas chamadas imediatamente.
- Excluir a função `sportsapi-sync` publicada e remover a chave `SPORTSAPI_KEY` guardada no backend.
- Remover do painel:
  - aba “Sugestões da API” em Programação;
  - seção SportsAPI em Configurações;
  - indicador de uso da SportsAPI em Canais.
- Excluir os arquivos exclusivos da integração: função, normalizador, hooks, telas e testes específicos.
- Remover a configuração da função no projeto.

### 2. Restaurar os jogos manuais

- Limpar somente os dados que a SportsAPI gravou nos 268 jogos manuais: vínculo externo, placar, relógio, período e status automático.
- Manter as colunas genéricas antigas de placar e status, pois elas já existiam antes da SportsAPI e podem continuar sendo preenchidas manualmente.
- Voltar a agenda pública para aceitar apenas jogos de origem manual.
- Manter o cálculo de “Ao vivo”, “Em breve” e “Encerrado” pelo horário de Brasília, como era antes.
- Preservar integralmente o fluxo de colar texto/imagem, revisão, publicação manual, canais/logos e WhatsApp.

### 3. Limpar o banco e as programações vencidas

- Apagar definitivamente de `daily_games` todos os jogos anteriores à data atual em `America/Sao_Paulo`, mantendo hoje e todas as datas futuras.
- Fazer a exclusão em uma operação controlada no banco, sem criar uma rotina recorrente: a própria consulta pública já filtra datas atuais, e novas limpezas poderão ser feitas pelo fluxo administrativo quando necessário.
- Remover as tabelas `sportsapi_suggestions` e `sportsapi_sync_runs`, seus índices, políticas e gatilhos.
- Remover todas as configurações `sportsapi_*`.
- Remover apenas as colunas exclusivas da SportsAPI em `daily_games`.
- Registrar uma migração de reversão para que ambientes novos também terminem sem a integração; os arquivos históricos aplicados permanecem como histórico técnico do banco.
- Remover registros de auditoria exclusivos da integração quando isso puder ser feito sem varrer todo o histórico e bloquear o banco.

### 4. Reduzir a lentidão sem mudar o visual

- Parar a atualização duplicada da Programação a cada 30 segundos e usar a atualização em tempo real já existente, com recarga ao voltar para a aba ou reconectar.
- Retirar a exclusão automática de duplicados da consulta pública; a leitura da página não fará mais operações de manutenção no banco.
- Buscar apenas os campos realmente usados na agenda pública, reduzindo o volume transferido.
- Manter a consulta de amanhã sem atualização contínua, pois ela serve apenas para resumo/atalho.
- Persistir temporariamente no navegador o resultado da verificação de trailers, evitando repetir dezenas de chamadas ao recarregar Filmes/Séries.
- Manter aparência, navegação, textos e formato atual das páginas.

### 5. Validação final

- Confirmar no banco que o agendamento, tabelas, configurações e função SportsAPI deixaram de existir.
- Confirmar que nenhum jogo manual mantém metadados aplicados pela API.
- Confirmar que `daily_games` contém somente hoje e datas futuras, usando a data de São Paulo como referência.
- Verificar publicação manual, agenda pública, busca/filtros, canais, WhatsApp e Filmes/Séries.
- Testar celular e computador, incluindo ausência de tela branca, erros e rolagem horizontal.
- Rodar os testes existentes e confirmar o carregamento sem consultas recorrentes da SportsAPI.

## Detalhes técnicos

- As funções puras de formatação de placar/relógio serão movidas para o utilitário geral de jogos antes da exclusão do módulo SportsAPI.
- A restauração de dados será limitada às linhas identificadas por `external_source = 'sportsapi'` ou `last_api_sync_at IS NOT NULL`, evitando alterar placares manuais legítimos.
- O principal ganho imediato virá do fim do agendamento por minuto e das dezenas de milhares de leituras/escritas da SportsAPI; as demais otimizações reduzem o custo de cada visita pública.
