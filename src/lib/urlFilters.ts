/**
 * Filtros da agenda persistentes na URL (Lote 2).
 *
 * Um link como `/programacao?esporte=basketball` ou
 * `/programacao?time=Palmeiras` abre já filtrado — sem conta, sem
 * login, só query params. Os nomes são explícitos (não siglas) para
 * o link ser legível ao compartilhar.
 *
 * Valores fora do padrão são ignorados (nunca quebram a página):
 * esporte desconhecido volta para "all", status/ordem inválidos
 * voltam para o padrão, e texto vazio some da URL.
 */

import type { FilterValue } from "@/components/agenda/public/SportFilterBar";
import type { StatusFilter, SortMode } from "@/components/agenda/public/ScheduleToolbar";
import type { SportType } from "@/lib/gameUtils";

const KNOWN_SPORTS: ReadonlySet<string> = new Set([
  "football", "basketball", "volleyball", "tennis", "mma", "boxing",
  "f1", "hockey", "baseball", "rugby", "surf", "cycling", "swimming", "golf",
]);

export interface AgendaUrlFilters {
  esporte: FilterValue;
  status: StatusFilter;
  ordem: SortMode;
  canal: string | null;
  q: string;
  time: string;
  competicao: string;
}

export const DEFAULT_AGENDA_URL_FILTERS: AgendaUrlFilters = {
  esporte: "all",
  status: "all",
  ordem: "time",
  canal: null,
  q: "",
  time: "",
  competicao: "",
};

export function parseAgendaUrlFilters(params: URLSearchParams): AgendaUrlFilters {
  const esporteRaw = params.get("esporte");
  const esporte: FilterValue =
    esporteRaw === "live"
      ? "live"
      : esporteRaw && KNOWN_SPORTS.has(esporteRaw)
        ? (esporteRaw as SportType)
        : "all";
  const statusRaw = params.get("status");
  const status: StatusFilter =
    statusRaw === "live" || statusRaw === "soon" || statusRaw === "ended" ? statusRaw : "all";
  const ordem: SortMode = params.get("ordem") === "sport" ? "sport" : "time";
  return {
    esporte,
    status,
    ordem,
    canal: params.get("canal") || null,
    q: params.get("q") || "",
    time: params.get("time") || "",
    competicao: params.get("competicao") || "",
  };
}

/** Serializa só o que difere do padrão — link curto e legível. */
export function serializeAgendaUrlFilters(f: AgendaUrlFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.esporte !== "all") p.set("esporte", f.esporte);
  if (f.status !== "all") p.set("status", f.status);
  if (f.ordem !== "time") p.set("ordem", f.ordem);
  if (f.canal) p.set("canal", f.canal);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.time.trim()) p.set("time", f.time.trim());
  if (f.competicao.trim()) p.set("competicao", f.competicao.trim());
  return p;
}

/** URL absoluta do link filtrado, pronta para copiar/compartilhar. */
export function buildFilteredAgendaUrl(
  origin: string,
  pathname: string,
  filters: AgendaUrlFilters,
  date: string | null,
): string {
  const p = serializeAgendaUrlFilters(filters);
  if (date) p.set("date", date);
  const qs = p.toString();
  return `${origin}${pathname}${qs ? `?${qs}` : ""}`;
}
