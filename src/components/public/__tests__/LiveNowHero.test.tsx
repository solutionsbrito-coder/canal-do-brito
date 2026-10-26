import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveNowHero } from "../LiveNowHero";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    create: (Component: any) => Component,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/useLiveTick", () => ({
  useLiveTick: () => 0,
}));

const mockUseAllDailyGames = vi.fn();
vi.mock("@/hooks/useDailyGames", () => ({
  useAllDailyGames: (...args: any[]) => mockUseAllDailyGames(...args),
}));

// Mock gameUtils to control "live" status
vi.mock("@/lib/gameUtils", () => ({
  getLocalDateString: () => "2026-03-25",
  isGameCurrentlyLive: vi.fn(() => false),
  getElapsedMinutes: () => 45,
  isNonAdversarial: (st: string) => ["f1", "mma"].includes(st),
  SPORT_EMOJI: { football: "⚽", f1: "🏎️" },
  SPORT_DURATION: { football: 105 },
  SPORT_LABEL: { football: "Futebol", f1: "F1" },
}));

const { isGameCurrentlyLive } = await import("@/lib/gameUtils");

describe("LiveNowHero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when there are no live games", () => {
    mockUseAllDailyGames.mockReturnValue({ data: [], isLoading: false });
    (isGameCurrentlyLive as any).mockReturnValue(false);

    const { container } = render(<LiveNowHero />);
    expect(container.textContent).toContain("Nenhum jogo ao vivo agora");
  });

  it("shows skeleton during loading", () => {
    mockUseAllDailyGames.mockReturnValue({ data: undefined, isLoading: true });

    render(<LiveNowHero />);
    // Skeleton has shimmer elements
    expect(document.querySelector(".skeleton-shimmer")).toBeTruthy();
  });

  it("renders live match cards when games are live", () => {
    (isGameCurrentlyLive as any).mockReturnValue(true);
    mockUseAllDailyGames.mockReturnValue({
      data: [
        {
          id: "1",
          home_team: "Flamengo",
          away_team: "Palmeiras",
          competition: "Brasileirão",
          game_time: "16:00",
          date: "2026-03-25",
          sport_type: "football",
          channels: ["Globo"],
          active: true,
          archived: false,
          is_live: true,
          is_womens: false,
          status_short: "live",
          created_at: "",
          competition_detail: null,
          elapsed_minutes: null,
          publish_at: null,
        },
      ],
      isLoading: false,
    });

    render(<LiveNowHero />);
    expect(screen.getByText("Flamengo")).toBeInTheDocument();
    expect(screen.getByText("Palmeiras")).toBeInTheDocument();
    expect(screen.getByText("Ao Vivo Agora")).toBeInTheDocument();
    expect(screen.getByText("1 jogo")).toBeInTheDocument();
  });

  it("shows correct plural for multiple live games", () => {
    (isGameCurrentlyLive as any).mockReturnValue(true);
    mockUseAllDailyGames.mockReturnValue({
      data: [
        { id: "1", home_team: "A", away_team: "B", competition: "X", game_time: "16:00", date: "2026-03-25", sport_type: "football", channels: [], active: true, archived: false, is_live: true, is_womens: false, status_short: "live", created_at: "", competition_detail: null, elapsed_minutes: null, publish_at: null },
        { id: "2", home_team: "C", away_team: "D", competition: "Y", game_time: "16:30", date: "2026-03-25", sport_type: "football", channels: [], active: true, archived: false, is_live: true, is_womens: false, status_short: "live", created_at: "", competition_detail: null, elapsed_minutes: null, publish_at: null },
      ],
      isLoading: false,
    });

    render(<LiveNowHero />);
    expect(screen.getByText("2 jogos")).toBeInTheDocument();
  });
});
