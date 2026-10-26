import { useEffect, useRef, useState } from "react";
import { Activity, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { getStoredAttribution, getAnonymousId, getSessionId } from "@/lib/analytics";

interface TrackedEvent {
  id: number;
  ts: string;
  event: string;
  props: Record<string, unknown>;
}

const ENABLED_KEY = "cb:debug_overlay_enabled";

/**
 * Floating, dev-only debug overlay that shows the last UTM attribution and a
 * live feed of analytics events dispatched via `window.dispatchEvent("analytics:track")`.
 *
 * Toggle ways:
 * - Add `?debug=1` to the URL (persists in localStorage)
 * - Add `?debug=0` to disable
 * - Press Ctrl+Shift+D
 */
export const AnalyticsDebugOverlay = () => {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [tab, setTab] = useState<"attribution" | "events">("attribution");
  const counterRef = useRef(0);

  // Init: read URL flag + persisted flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("debug");
    if (flag === "1") {
      localStorage.setItem(ENABLED_KEY, "1");
      setEnabled(true);
    } else if (flag === "0") {
      localStorage.removeItem(ENABLED_KEY);
      setEnabled(false);
    } else {
      setEnabled(localStorage.getItem(ENABLED_KEY) === "1");
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setEnabled((v) => {
          const next = !v;
          if (next) localStorage.setItem(ENABLED_KEY, "1");
          else localStorage.removeItem(ENABLED_KEY);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Listen for tracked events
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { event: string; props: Record<string, unknown> };
      if (!detail) return;
      counterRef.current += 1;
      setEvents((prev) => [
        {
          id: counterRef.current,
          ts: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
          event: detail.event,
          props: detail.props ?? {},
        },
        ...prev,
      ].slice(0, 50));
    };
    window.addEventListener("analytics:track", handler as EventListener);
    return () => window.removeEventListener("analytics:track", handler as EventListener);
  }, [enabled]);

  if (!enabled) return null;

  const attribution = getStoredAttribution();
  const anonId = getAnonymousId();
  const sessId = getSessionId();

  return (
    <div
      className="fixed z-[100] bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] right-3 max-w-[92vw] w-[360px] rounded-xl border border-primary/30 bg-background/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] font-body text-foreground"
      role="region"
      aria-label="Analytics debug overlay"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary min-h-[32px]"
        >
          <Activity className="h-3.5 w-3.5" />
          Analytics Debug
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => {
            localStorage.removeItem(ENABLED_KEY);
            setEnabled(false);
          }}
          aria-label="Fechar debug"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {open && (
        <>
          <nav className="flex border-b border-border/40 text-[11px]">
            {(["attribution", "events"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2 font-semibold uppercase tracking-wider transition-colors ${
                  tab === t
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "attribution" ? "Atribuição" : `Eventos (${events.length})`}
              </button>
            ))}
          </nav>

          <div className="max-h-[55vh] overflow-y-auto p-3 text-[11px] leading-relaxed">
            {tab === "attribution" && (
              <div className="space-y-2">
                <Row label="user_id (anon)" value={anonId} mono />
                <Row label="session_id" value={sessId} mono />
                <div className="h-px bg-border/40 my-2" />
                {attribution ? (
                  <>
                    <Row label="utm_source" value={attribution.utm_source} />
                    <Row label="utm_medium" value={attribution.utm_medium} />
                    <Row label="utm_campaign" value={attribution.utm_campaign} highlight />
                    <Row label="utm_content" value={attribution.utm_content} highlight />
                    <Row label="utm_term" value={attribution.utm_term} />
                    <Row label="landing tab" value={attribution.tab as string | undefined} />
                  </>
                ) : (
                  <p className="text-muted-foreground italic">
                    Nenhuma atribuição UTM nesta sessão. Abra o site com `?utm_source=...&utm_campaign=...` para testar.
                  </p>
                )}
              </div>
            )}

            {tab === "events" && (
              <div className="space-y-2">
                <button
                  onClick={() => setEvents([])}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-3 w-3" /> Limpar
                </button>
                {events.length === 0 ? (
                  <p className="text-muted-foreground italic">Nenhum evento ainda. Navegue entre as abas ou clique em um card.</p>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="rounded-md bg-surface border border-border/30 p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-primary truncate">{ev.event}</span>
                        <span className="text-muted-foreground tabular-nums shrink-0">{ev.ts}</span>
                      </div>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(ev.props, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <footer className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/40">
            Ctrl+Shift+D para alternar · ?debug=0 para desativar
          </footer>
        </>
      )}
    </div>
  );
};

const Row = ({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  highlight?: boolean;
}) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span
      className={`text-right break-all ${mono ? "font-mono text-[10px]" : ""} ${
        highlight && value ? "text-primary font-semibold" : "text-foreground"
      }`}
    >
      {value || <span className="text-muted-foreground/50 italic">—</span>}
    </span>
  </div>
);

export default AnalyticsDebugOverlay;
