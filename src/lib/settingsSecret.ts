/** Espelha o trigger enforce_settings_secret_flag do banco: chaves com
 * nome de segredo só podem ser gravadas com is_secret = true. Sem isso,
 * a primeira gravação (insert) de tmdb_api_key era rejeitada. */
export const isSecretSettingKey = (key: string) =>
  /(secret|token|api[_-]?key|private[_-]?key|password|service[_-]?role|vapid[_-]?private)/i.test(key);
