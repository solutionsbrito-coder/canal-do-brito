import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const THRESHOLD = 80;

export function usePullToRefresh(targetRef: React.RefObject<HTMLElement | null>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const didVibrate = useRef(false);
  const queryClient = useQueryClient();

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 800);
  }, [queryClient]);

  useEffect(() => {
    if (!("ontouchstart" in window)) return;
    const el = targetRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      didVibrate.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = Math.max(0, e.touches[0].clientY - startY.current);
      // Dampen the pull
      const dampened = Math.min(dy * 0.4, 140);
      pullDistanceRef.current = dampened;
      setPullDistance(dampened);

      // Haptic feedback when crossing threshold
      if (dampened >= THRESHOLD && !didVibrate.current) {
        didVibrate.current = true;
        navigator.vibrate?.(15);
      } else if (dampened < THRESHOLD) {
        didVibrate.current = false;
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistanceRef.current >= THRESHOLD) {
        onRefresh();
      }
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [targetRef, isRefreshing, onRefresh]);

  return { pullDistance, isRefreshing };
}
