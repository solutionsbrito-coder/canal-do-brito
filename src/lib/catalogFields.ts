/**
 * Campos de catálogo próprio (Lote 1) de filmes e séries.
 *
 * O TMDB continua sendo só metadado (capa, sinopse, trailer). Estes
 * campos dizem se/como o título existe NO SERVIÇO PRÓPRIO do usuário —
 * nunca apontam para Netflix, Prime ou outra plataforma externa.
 *
 * Compatibilidade: as colunas são novas (migration do Lote 1). Títulos
 * antigos chegam com null nestes campos; os padrões sensatos são:
 * - available_in_catalog: true (o título já estava na vitrine);
 * - featured: false;
 * - catalog_category / internal_link: null até o admin preencher;
 * - leaves_at: null (sem saída prevista).
 *
 * No formulário do admin, categoria e link interno são obrigatórios
 * quando o título está marcado como disponível no catálogo — sem eles,
 * o visitante não saberia onde assistir no serviço próprio.
 */
export interface CatalogFields {
  available_in_catalog: boolean;
  catalog_category: string | null;
  internal_link: string | null;
  featured: boolean;
  leaves_at: string | null;
}

export const DEFAULT_CATALOG_FIELDS: CatalogFields = {
  available_in_catalog: true,
  catalog_category: null,
  internal_link: null,
  featured: false,
  leaves_at: null,
};

/** Campos vindos do banco podem ser null (pré-migration) — normaliza. */
export function normalizeCatalogFields(
  input: Partial<CatalogFields> | null | undefined,
): CatalogFields {
  return {
    available_in_catalog: input?.available_in_catalog ?? true,
    catalog_category: input?.catalog_category ?? null,
    internal_link: input?.internal_link ?? null,
    featured: input?.featured ?? false,
    leaves_at: input?.leaves_at ?? null,
  };
}

/** O que falta preencher no formulário de catálogo (só quando disponível). */
export function missingCatalogFields(fields: CatalogFields): string[] {
  if (!fields.available_in_catalog) return [];
  const missing: string[] = [];
  if (!fields.catalog_category?.trim()) missing.push("categoria do catálogo");
  if (!fields.internal_link?.trim()) missing.push("link interno");
  return missing;
}
