/**
 * Agendamento e expiração de Novidades (mesmo padrão dos banners).
 *
 * Semântica:
 * - Agendada: publish_at no futuro e active=false. O job do banco ativa
 *   quando chega a hora e limpa o publish_at (igual à activate-scheduled
 *   faz com banners).
 * - Expirada: expires_at no passado. O público não vê (filtro na query +
 *   defesa client-side) e o job desativa (active=false), sem apagar o
 *   expires_at — assim o admin vê o selo e pode prorrogar a data.
 * - Reativar manualmente um item expirado sem mudar a data só dura até o
 *   próximo ciclo do job, que desativa de novo.
 *
 * Conversão para datetime-local: usa o horário LOCAL do admin (difere do
 * BannerCard, que usa slice UTC do toISOString e desloca a hora ao salvar
 * sem alteração — quirk pré-existente dos banners, fora deste lote).
 */

export interface SchedulableLike {
  publish_at: string | null;
  expires_at: string | null;
  active: boolean;
}

export const isScheduled = (item: SchedulableLike, now = Date.now()): boolean =>
  !!item.publish_at && !item.active && new Date(item.publish_at).getTime() > now;

export const isExpired = (item: SchedulableLike, now = Date.now()): boolean =>
  !!item.expires_at && new Date(item.expires_at).getTime() < now;

/** O que o público pode ver: ativo, não expirado, publicação já chegada. */
export const isVisibleToPublic = (item: SchedulableLike, now = Date.now()): boolean =>
  item.active && !isExpired(item, now) && !(item.publish_at && new Date(item.publish_at).getTime() > now);

/** Erro de validação ou null quando as datas são aceitáveis. */
export const validateSchedule = (
  publish_at: string | null,
  expires_at: string | null,
): string | null => {
  if (publish_at && expires_at && new Date(expires_at).getTime() <= new Date(publish_at).getTime()) {
    return "A expiração precisa ser depois da publicação.";
  }
  return null;
};

/** ISO -> valor de <input type="datetime-local"> em horário local. */
export const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** Valor de <input type="datetime-local"> -> ISO (UTC), ou null quando vazio. */
export const fromDatetimeLocal = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;
