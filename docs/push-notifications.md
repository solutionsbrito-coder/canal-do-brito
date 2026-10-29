# Notificações push — agendador e função de envio (B5)

Este documento é o registro do agendador de push no repositório. O job
em si vive SÓ no banco (pg_cron, no painel do Supabase) — não há
arquivo de migration que o recrie. Se ele for apagado, esta página tem
o que é preciso para recriá-lo. Verificado por leitura em 2026-10-28.

## O fluxo completo, em uma frase

A cada 5 minutos, o pg_cron chama a Edge Function
`send-push-notifications`, que procura jogos ativos a 8–17 min do
início, envia o push para as inscrições com aquele jogo marcado e
remove o jogo só das inscrições cujo envio retornou `ok`.

## O job (pg_cron)

- **jobid:** 2
- **jobname:** `send-push-notifications-every-5-min`
- **schedule:** `*/5 * * * *` (a cada 5 minutos; o fuso não importa
  aqui porque a função converte o horário para Brasília internamente)
- **active:** `true`
- **Mecanismo:** `net.http_post` (extensão pg_net) para a Edge Function,
  com corpo vazio. A autenticação usa a **chave publishable** do app
  (a mesma do front), nos dois cabeçalhos — NÃO a service role key.
  Isso funciona porque a função está com `verify_jwt = false` e usa a
  service role internamente, via variável de ambiente, para ler o
  banco. Nunca cole o valor da chave neste documento: o repositório é
  público e a chave já vai no bundle do front por natureza — o
  documento registra o PAPEL dela, não o valor.

Comando (com placeholder no lugar da chave):

```sql
SELECT net.http_post(
  url := 'https://fnubytvuudrwelwdawqs.supabase.co/functions/v1/send-push-notifications',
  headers := '{"Content-Type": "application/json", "apikey": "<chave publishable>", "Authorization": "Bearer <chave publishable>"}'::jsonb,
  body := '{}'::jsonb
);
```

Para recriar o job, rode no SQL Editor do projeto `canal-do-brito`
algo como (ajuste o nome se já existir outro job com o mesmo nome):

```sql
SELECT cron.schedule(
  'send-push-notifications-every-5-min',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://fnubytvuudrwelwdawqs.supabase.co/functions/v1/send-push-notifications',
    headers := '{"Content-Type": "application/json", "apikey": "<chave publishable>", "Authorization": "Bearer <chave publishable>"}'::jsonb,
    body := '{}'::jsonb
  )$$
);
```

## O que a função faz em cada tick

Fonte: `functions/send-push-notifications.ts` (o arquivo da função NÃO
vive neste repositório — ele é publicado pelo editor do dashboard do
Supabase; o que está aqui é o comportamento, não o código).

- Busca jogos ativos de **hoje e de amanhã** (B6: os jogos das
  00:00–00:14 têm o tick das 23:50 do dia anterior).
- Janela: jogo a 8–17 min do início (`diff` entre −7 e +3 min em
  relação a agora + 15). O tick exato é 15 min antes; 8–12 min é a
  segunda chance, com o texto "Comeca em poucos min!" em vez de
  "Comeca em 15 min!".
- Envio falho (5xx, timeout, erro de criptografia) mantém o jogo para
  o próximo tick (`kept_for_retry`); inscrição expirada (410/404) é
  apagada; invocação dupla é amortecida por dedupe + releitura de
  `game_ids` antes de cada envio (`skipped`, `deduped` na resposta) —
  trava não atômica; o log do B4 reduz duplicatas entre ticks (pares
  já enviados nas últimas 24h são pulados), não dentro do mesmo
  instante.
- Cada tentativa é registrada em `push_delivery_log` (B4: `sent`,
  `failed`, `skipped`, `expired`), com poda de 30 dias pelo job
  diário do B3. O log é best-effort: falha dele nunca quebra o envio.
- O sino tardio (< 13 min) NÃO passa pela função: é notificação local
  imediata, sem vínculo no servidor (A4).

## Rotação de endpoint (B1 + B2)

- O service worker tenta re-sincronizar o endpoint novo sozinho
  quando o navegador rotaciona (B2, best-effort).
- O app guarda o endpoint atual em localStorage
  (`canalbrito:push-endpoint:v1`) a cada sync; no sync seguinte, se o
  endpoint mudou, chama a RPC `transfer_push_game_ids`, que COPIA
  (união, sem duplicar) os `game_ids` do endpoint antigo para o novo
  (B1). Cópia, não movimento: a linha antiga continua intacta — se
  ela ainda está viva em outro contexto, continua recebendo; se está
  morta, a função a apaga no próximo 410/404 e o job do B3 limpa o
  resto.

## Como saber se está saudável

No SQL Editor do projeto `canal-do-brito`, só leitura:

```sql
-- O job existe e está ativo?
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname = 'send-push-notifications-every-5-min';

-- As últimas execuções foram bem-sucedidas?
SELECT start_time, status, return_message FROM cron.job_run_details
WHERE jobid = 2
ORDER BY start_time DESC
LIMIT 5;
```

Sinais de saúde (exemplo real de 2026-10-28, após o redeploy do
A7+B6): execuções a cada 5 minutos, todas com `status = 'succeeded'`.

## O que NÃO significa "succeeded"

O `return_message` do pg_cron ("1 row") diz só que o comando SQL
rodou — NÃO diz quantos pushes foram enviados. Desde o B4, há log
persistente de entrega em `push_delivery_log`: para ver o que saiu
de fato num dia, consulte o log (a resposta da função continua
efêmera, mas o log fica 30 dias):

```sql
-- O que foi enviado / falhou / pulado no último dia?
SELECT status, count(*) FROM push_delivery_log
WHERE created_at > now() - interval '1 day'
GROUP BY status;
```

## Alerta: se o job parar, nada avisa

Se o job for desativado, falhar ou parar de rodar, as notificações
param em silêncio — nenhum erro aparece no app, porque o app nunca
sabe que o tick não aconteceu. Verificação mínima periódica: se não
houver nenhuma execução com `succeeded` nos últimos 10 minutos, ou se
o `status` passar a `failed`, o job precisa de atenção. (O alerta
automático no admin é o item opcional do B5, ainda não implementado.)

## Redeploy da função — cuidado com a colagem

A função é publicada pelo editor do dashboard (Edge Functions >
send-push-notifications > Code > Deploy updates). A colagem no editor
Monaco já falhou silenciosamente uma vez (2026-10-28, lote A7+B6):
sempre conferir por busca no editor por um termo novo do lote ANTES
de clicar em Deploy, e só publicar com o termo encontrado.
