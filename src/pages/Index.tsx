import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { AppNavbar } from "@/components/public/AppNavbar";
import { TAB_SLUGS, SLUG_TO_TAB } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/public/PullToRefreshIndicator";
import { PublicFooter } from "@/components/public/PublicFooter";
import { BottomNav } from "@/components/public/BottomNav";
import { SectionHeaderSkeleton, GameCardSkeleton, NewsBannerSkeleton } from "@/components/public/ContentSkeletons";
import { captureLandingAttribution, getStoredAttribution, track } from "@/lib/analytics";

const ProgramacaoTab = lazy(() => import("@/components/public/ProgramacaoTab"));
const LazyNovidadesPage = lazy(() => import("@/components/public/NovidadesPage").then(m => ({ default: m.NovidadesPage })));

const LazyAnalyticsDebugOverlay = lazy(() => import("@/components/public/AnalyticsDebugOverlay"));

const ScheduleFallback = () => (
  <div className="px-4 pt-5 pb-3 space-y-5">
    <SectionHeaderSkeleton />
    {[0, 1, 2].map((i) => <GameCardSkeleton key={i} index={i} />)}
  </div>
);

const BelowFoldSkeleton = () => (
  <div className="space-y-5 px-4" style={{ minHeight: 560 }}>
    <NewsBannerSkeleton />
    <div className="rounded-xl skeleton-shimmer h-[88px]" />
  </div>
);

const TAB_ORDER = ["schedule", "novidades"] as const;
type TabId = typeof TAB_ORDER[number];

const Index = () => {
  const mainRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>("schedule");
  const { pullDistance, isRefreshing } = usePullToRefresh(mainRef);

  const handleTabChange = useCallback((tabId: string) => {
    // Backwards-compat: legacy ids → schedule (default) ou novidades
    let normalized = tabId;
    if (normalized === "home" || normalized === "live" || normalized === "ao-vivo") normalized = "schedule";
    if (
      normalized === "highlights" ||
      normalized === "sugestoes" ||
      normalized === "destaques" ||
      normalized === "filmes" ||
      normalized === "series"
    ) {
      normalized = "novidades";
    }
    const next = normalized as TabId;
    if (!TAB_ORDER.includes(next)) return;
    setActiveTab(next);
    // Sync URL so refresh stays on the same tab
    const targetPath = `/${TAB_SLUGS[next]}`;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, "", targetPath + window.location.search + window.location.hash);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Listen for nav-tab-change events from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail as string;
      handleTabChange(tabId);
    };
    window.addEventListener("nav-tab-change", handler);
    return () => window.removeEventListener("nav-tab-change", handler);
  }, [handleTabChange]);

  // Deep-link support + UTM landing attribution.
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("tab");
    const candidate = path || fromQuery;
    let landingTab: TabId = "schedule";
    if (candidate) {
      const mapped = SLUG_TO_TAB[candidate.toLowerCase()];
      if (mapped) {
        handleTabChange(mapped);
        landingTab = mapped as TabId;
      }
    }
    captureLandingAttribution(landingTab);

    if (fromQuery || params.has("utm_source") || params.has("utm_campaign") || params.has("utm_content")) {
      // Preserva ?date= e demais params relevantes ao remover só os de UTM/tab
      params.delete("tab");
      params.delete("utm_source");
      params.delete("utm_medium");
      params.delete("utm_campaign");
      params.delete("utm_content");
      const qs = params.toString();
      const cleanUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emit a tab_view event whenever the active tab changes
  useEffect(() => {
    const attribution = getStoredAttribution();
    track("tab_view", {
      tab: activeTab,
      utm_source: attribution?.utm_source ?? null,
      utm_medium: attribution?.utm_medium ?? null,
      utm_campaign: attribution?.utm_campaign ?? null,
      utm_content: attribution?.utm_content ?? null,
      from_share: attribution?.utm_campaign?.startsWith("share-") ?? false,
    });
  }, [activeTab]);

  const renderContent = () => {
    if (activeTab === "novidades") {
      return (
        <Suspense fallback={<BelowFoldSkeleton />}>
          <LazyNovidadesPage />
        </Suspense>
      );
    }
    // schedule (default)
    return (
      <Suspense fallback={<ScheduleFallback />}>
        <ProgramacaoTab />
      </Suspense>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-x-hidden">
      {/* Ambient green blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full animate-blob-a atm-blob"
          style={{ background: "radial-gradient(circle, hsl(153 100% 50% / 0.06), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-[240px] h-[240px] rounded-full animate-blob-b atm-blob"
          style={{ background: "radial-gradient(circle, hsl(153 100% 50% / 0.04), transparent 70%)" }}
        />
      </div>

      {/* Grain */}
      <div className="grain-overlay" />

      <AppNavbar />

      <main ref={mainRef} className="relative z-10 flex-1" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))", overscrollBehaviorY: "contain" }}>
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <div key={activeTab} className="animate-fade-up motion-reduce:animate-none">
          {renderContent()}
        </div>
      </main>

      <PublicFooter />
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      <Suspense fallback={null}>
        <LazyAnalyticsDebugOverlay />
      </Suspense>
    </div>
  );
};

export default Index;
