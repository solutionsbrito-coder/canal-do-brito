/**
 * "Minha lista" (Lote 2) — SEM login, como todo o resto do público.
 *
 * O visitante marca "quero ver" ou "já vi" num filme/série do catálogo
 * próprio e isso fica salvo só no dispositivo dele (localStorage),
 * nunca no banco e nunca associado a um user_id. Trocar de aparelho
 * ou limpar os dados apaga a lista — esperado, e avisado na seção.
 */

export type ListaStatus = "want" | "watched";

export interface ListaItem {
  kind: "movie" | "series";
  id: string;
  title: string;
  poster_url: string | null;
  status: ListaStatus;
  saved_at: string; // ISO
}

export const MINHA_LISTA_STORAGE_KEY = "canalbrito:minha-lista:v1";

type StoredItem = Omit<ListaItem, "saved_at"> & { saved_at?: string };

function isValidStored(v: unknown): v is StoredItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.kind === "movie" || o.kind === "series") &&
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    (o.status === "want" || o.status === "watched")
  );
}

export function loadMinhaLista(): ListaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MINHA_LISTA_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStored).map((i) => ({
      ...i,
      poster_url: typeof i.poster_url === "string" ? i.poster_url : null,
      saved_at: i.saved_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function saveMinhaLista(items: ListaItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MINHA_LISTA_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Modo privado etc.: a lista vale só na sessão.
  }
}

export function upsertListaItem(
  items: ListaItem[],
  item: Omit<ListaItem, "saved_at">,
): ListaItem[] {
  const rest = items.filter((i) => !(i.kind === item.kind && i.id === item.id));
  return [...rest, { ...item, saved_at: new Date().toISOString() }];
}

export function removeListaItem(
  items: ListaItem[],
  kind: "movie" | "series",
  id: string,
): ListaItem[] {
  return items.filter((i) => !(i.kind === kind && i.id === id));
}

export function findListaItem(
  items: ListaItem[],
  kind: "movie" | "series",
  id: string,
): ListaItem | undefined {
  return items.find((i) => i.kind === kind && i.id === id);
}
