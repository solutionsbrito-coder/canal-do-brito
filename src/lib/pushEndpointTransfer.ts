// B1 — transferência de lembretes quando o navegador rotaciona o
// endpoint push sozinho.
//
// Como funciona: o app guarda o endpoint atual em localStorage a
// cada sync. No próximo sync, se o endpoint mudou, o app chama a RPC
// transfer_push_game_ids, que COPIA (união, sem duplicar) os game_ids
// do endpoint antigo para o novo. Cópia, não movimento: a linha
// antiga continua intacta — se ela ainda está viva (outro contexto
// do mesmo aparelho, caso D3), ela continua recebendo; se está morta,
// a função a apaga na próxima tentativa 410/404 e o job do B3 limpa
// o resto. Apagar a antiga aqui faria os lembretes "ping-pong"
// entre PWA e Chrome.
//
// Best-effort total: falha de leitura/escrita do storage ou erro da
// RPC nunca pode quebrar o sino — o sync já aconteceu antes, e o
// pior caso sem transferência é o comportamento pré-B1 (lembretes do
// endpoint antigo perdidos até o usuário tocar o sino de novo).

export const PUSH_ENDPOINT_STORAGE_KEY = "canalbrito:push-endpoint:v1";

export type PushEndpointTransferDeps = {
  getStoredEndpoint: () => string | null;
  setStoredEndpoint: (endpoint: string) => void;
  transferGameIds: (oldEndpoint: string, newEndpoint: string) => Promise<unknown>;
};

export async function transferPushEndpointIfRotated(
  currentEndpoint: string,
  deps: PushEndpointTransferDeps
): Promise<void> {
  let stored: string | null = null;
  try {
    stored = deps.getStoredEndpoint();
  } catch {
    stored = null;
  }

  if (stored && stored !== currentEndpoint) {
    try {
      await deps.transferGameIds(stored, currentEndpoint);
    } catch {
      // Best-effort: transferência falhou, o sync já está feito.
    }
  }

  try {
    deps.setStoredEndpoint(currentEndpoint);
  } catch {
    // Storage indisponível: sem transferência na próxima vez, sem erro.
  }
}
