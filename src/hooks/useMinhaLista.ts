import { useCallback, useEffect, useState } from "react";
import {
  loadMinhaLista,
  saveMinhaLista,
  upsertListaItem,
  removeListaItem,
  findListaItem,
  type ListaItem,
  type ListaStatus,
} from "@/lib/minhaLista";

/** Estado da "Minha lista", espelhado no localStorage (sem login). */
export const useMinhaLista = () => {
  const [items, setItems] = useState<ListaItem[]>(() => loadMinhaLista());

  useEffect(() => {
    saveMinhaLista(items);
  }, [items]);

  const setStatus = useCallback(
    (item: Omit<ListaItem, "saved_at" | "status">, status: ListaStatus) => {
      setItems((cur) => upsertListaItem(cur, { ...item, status }));
    },
    [],
  );

  const remove = useCallback((kind: "movie" | "series", id: string) => {
    setItems((cur) => removeListaItem(cur, kind, id));
  }, []);

  const get = useCallback(
    (kind: "movie" | "series", id: string) => findListaItem(items, kind, id),
    [items],
  );

  return { items, setStatus, remove, get };
};
