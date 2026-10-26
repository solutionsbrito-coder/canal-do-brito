# Fazer a página voltar a abrir

## Causa confirmada
O banco de dados do app (Lovable Cloud) está **pausado**. Enquanto ele estiver parado, a página não recebe a programação, os banners nem o conteúdo, e por isso fica só carregando. Isso afeta o site publicado e a pré-visualização.

## O que será feito
1. **Religar o banco de dados.** Você vai receber um pedido de aprovação para isso.
2. **Esperar ele ficar pronto** e confirmar que está funcionando normalmente.
3. **Enviar a correção da leitura de imagens que ficou pendente.** É a correção dos títulos de esporte e do canal falso "A confirmar", que não foi para o ar porque o banco estava parado.
4. **Testar a página inicial e a Programação** no celular e no computador. A ideia é confirmar que a agenda abre em poucos segundos e sem erros.
5. **Ver o tamanho e a saúde do banco.** Se ele estiver no limite de novo, explico o motivo e o que fazer.

## Fora desta rodada
- O código e o visual das telas não mudam.

## Detalhes técnicos
- Religar com `supabase--resume` e confirmar o estado com `cloud_status` até ficar `ACTIVE_HEALTHY`.
- Publicar a função `read-schedule-image` com `deploy_edge_functions`.
- Testar com Playwright em `/` e `?tab=programacao`, verificando as requisições de `daily_games` (resposta 200 e tempo de resposta).
- Rodar `db_health` para conferir disco e conexões.
