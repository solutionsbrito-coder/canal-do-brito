import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SLUG_TO_TAB, TAB_SLUGS } from "@/lib/utils";

const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Catch-all que tenta resolver o path como slug conhecido antes de cair em 404.
 * Evita que aliases listados em SLUG_TO_TAB (ex: /movies, /highlights) quebrem.
 */
export default function SlugFallback() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const tab = SLUG_TO_TAB[slug];
  if (tab) {
    return <Navigate to={`/${TAB_SLUGS[tab]}`} replace />;
  }
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
