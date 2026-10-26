import { useEffect, useRef } from "react";

/**
 * Focus trap + restauração de foco para overlays/modais.
 * - Salva o elemento ativo quando o overlay abre.
 * - Move o foco para o container (ou primeiro focável).
 * - Cicla foco com Tab/Shift+Tab dentro do container.
 * - Restaura o foco ao elemento original quando fecha.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;

    // Defer um tick para garantir que o container montou
    const id = window.setTimeout(() => {
      const node = containerRef.current;
      if (!node) return;
      const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusables[0];
      if (first) {
        first.focus();
      } else {
        node.setAttribute("tabindex", "-1");
        node.focus();
      }
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const node = containerRef.current;
      if (!node) return;
      const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKeyDown);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function" && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [active]);

  return containerRef;
}
