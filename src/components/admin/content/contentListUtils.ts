import { useMemo, useState } from "react";

export type ContentSortMode =
  | "manual"
  | "newest"
  | "oldest"
  | "title_asc"
  | "title_desc"
  | "rating_desc"
  | "rating_asc";

export const CONTENT_SORT_OPTIONS: { value: ContentSortMode; label: string }[] = [
  { value: "manual", label: "Ordem manual" },
  { value: "newest", label: "Mais novos" },
  { value: "oldest", label: "Mais antigos" },
  { value: "title_asc", label: "Título (A-Z)" },
  { value: "title_desc", label: "Título (Z-A)" },
  { value: "rating_desc", label: "Nota (maior)" },
  { value: "rating_asc", label: "Nota (menor)" },
];

interface SortableItem {
  title: string;
  rating: number | null;
  created_at?: string | null;
}

/** Applies one of the shared sort modes. `manual` keeps the incoming order. */
export function sortContent<T extends SortableItem>(list: T[], mode: ContentSortMode): T[] {
  if (mode === "manual") return list;
  const sorted = [...list];
  const t = (s: string | null | undefined) => (s || "").toLocaleLowerCase("pt-BR");
  const d = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);
  switch (mode) {
    case "newest": sorted.sort((a, b) => d(b.created_at) - d(a.created_at)); break;
    case "oldest": sorted.sort((a, b) => d(a.created_at) - d(b.created_at)); break;
    case "title_asc": sorted.sort((a, b) => t(a.title).localeCompare(t(b.title), "pt-BR")); break;
    case "title_desc": sorted.sort((a, b) => t(b.title).localeCompare(t(a.title), "pt-BR")); break;
    case "rating_desc": sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1)); break;
    case "rating_asc": sorted.sort((a, b) => (a.rating ?? Infinity) - (b.rating ?? Infinity)); break;
  }
  return sorted;
}

/** Sort mode persisted per admin tab in localStorage. */
export function usePersistedSort(storageKey: string) {
  const [sortMode, setSortModeState] = useState<ContentSortMode>(() => {
    if (typeof window === "undefined") return "manual";
    return (localStorage.getItem(storageKey) as ContentSortMode) || "manual";
  });
  const setSortMode = (v: ContentSortMode) => {
    setSortModeState(v);
    try { localStorage.setItem(storageKey, v); } catch { /* ignore */ }
  };
  return { sortMode, setSortMode };
}

/** Shared multi-selection state for bulk actions. */
export function useContentSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enterSelection = () => { setSelectionMode(true); setSelectedIds(new Set()); };
  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const clearSelection = () => setSelectedIds(new Set());
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));

  return useMemo(
    () => ({ selectionMode, selectedIds, enterSelection, exitSelection, clearSelection, toggleSelect, selectAll }),
    [selectionMode, selectedIds],
  );
}
