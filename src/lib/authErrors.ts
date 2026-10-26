/** Traduz erros de autenticação para mensagens amigáveis em PT-BR. */
export function friendlyAuthError(err: unknown): string {
  const raw = (err as { message?: string } | null)?.message?.toLowerCase() ?? "";
  if (!raw) return "Não foi possível entrar. Tente novamente.";
  if (raw.includes("invalid login credentials") || raw.includes("invalid_credentials"))
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  if (raw.includes("email not confirmed")) return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (raw.includes("too many requests") || raw.includes("rate limit"))
    return "Muitas tentativas. Aguarde um instante antes de tentar de novo.";
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("load failed"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  if (raw.includes("invalid email") || raw.includes("validation_failed"))
    return "Informe um e-mail válido.";
  return "Não foi possível entrar. Tente novamente.";
}
