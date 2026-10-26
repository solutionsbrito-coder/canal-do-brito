# Polimento completo dos painéis público e administrativo

## Objetivo
Manter o formato atual do Canal do Brito, reforçando a segurança da publicação manual, reduzindo carregamentos desnecessários e reunindo pendências operacionais no painel.

## O que será implementado

### Publicação da programação
- Salvar automaticamente o texto, a data e as opções da programação no navegador; oferecer restauração e descarte do rascunho.
- Antes de publicar ou republicar, mostrar um resumo comparativo por data: novos, já existentes/ignorados, selecionados, removidos na republicação, alertas e canais desconhecidos.
- Registrar uma versão de cada publicação/republicação com os jogos daquele momento.
- Exibir histórico recente com data, quantidade, autor e ação; permitir visualizar e restaurar uma versão com confirmação.

### Painel administrativo
- Aproveitar o checklist existente como central de pendências, destacando primeiro itens críticos e ações necessárias.
- Acrescentar um diagnóstico simples: horário da última atualização, duração das consultas e estado de cada área, sem polling adicional.
- Remover atualizações automáticas por minuto ainda existentes em listas administrativas; atualizar ao focar a janela, reconectar, receber alteração em tempo real ou usar o botão Atualizar.

### Painel público
- Manter Programação como conteúdo inicial e carregar Filmes/Séries/Novidades somente ao abrir essa aba.
- Remover a animação pesada do carregamento inicial e usar transição CSS leve com redução de movimento.
- Mostrar “Atualizado há X min” e botão acessível de atualização na Programação.
- Manter o último conteúdo válido durante falhas temporárias e apresentar erro humano com tentativa novamente.
- Persistir esporte, status, canal e ordenação durante a sessão.
- Revisar foco, rótulos, regiões de atualização e contraste nos elementos alterados.

### Limpeza segura
- Ajustar a rotina agendada existente para apagar definitivamente apenas programações anteriores ao dia atual em `America/Sao_Paulo`, preservando hoje e todas as datas futuras.
- Registrar na auditoria a quantidade removida e manter a rotina idempotente.
- Não adicionar consulta recorrente no navegador nem integração externa.

## Dados e segurança
- Criar uma tabela de versões da programação com acesso somente administrativo, permissões explícitas e políticas de acesso.
- A restauração será executada pelo fluxo administrativo autenticado e sempre exigirá confirmação.
- A limpeza ficará apenas no processamento agendado do servidor.

## Validação
- Testes do resumo comparativo, rascunho, histórico/restauração e preferências públicas.
- Verificação das telas principais em celular e computador, incluindo teclado, foco, mensagens de erro e ausência de rolagem horizontal.
- Conferência do fluxo completo: processar, revisar, publicar, consultar histórico e restaurar.
- Confirmar ausência de consultas automáticas contínuas no painel público e nas listas ajustadas.
