/**
 * Dev-only harness page used by Playwright E2E tests.
 * Mounts the BottomNav alongside the ContentDetailSheet and TrailerModal so we
 * can validate stacking, swipe-to-dismiss and close behavior without depending
 * on remote data (TMDB / Supabase). Not linked from the public UI.
 */
import { useState } from "react";
import { BottomNav } from "@/components/public/BottomNav";
import { ContentDetailSheet } from "@/components/public/ContentDetailSheet";
import { TrailerModal } from "@/components/public/TrailerModal";

const SAMPLE_ITEM = {
  title: "E2E Sample Title",
  overview: "A short overview used for end-to-end testing of the bottom sheet.",
  poster_url: "https://placehold.co/300x450/0F172A/00ff87?text=Poster",
  backdrop_url: "https://placehold.co/1280x720/0F172A/00ff87?text=Backdrop",
  rating: 8.4,
  year: 2024,
  genre: "Action, Drama",
  tmdb_id: 0,
  content_type: "movie",
};

const E2EModals = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-4">
      <h1 className="font-display text-2xl">E2E Modal Harness</h1>
      <div className="flex gap-3">
        <button
          data-testid="open-sheet"
          className="px-4 py-3 rounded-md bg-primary text-primary-foreground font-bold"
          onClick={() => setSheetOpen(true)}
        >
          Open Detail Sheet
        </button>
        <button
          data-testid="open-trailer"
          className="px-4 py-3 rounded-md bg-primary text-primary-foreground font-bold"
          onClick={() => setTrailerOpen(true)}
        >
          Open Trailer
        </button>
      </div>

      {/* Tall content so the page is scrollable, mimicking real usage. */}
      <div style={{ height: "150vh" }} />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <ContentDetailSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={SAMPLE_ITEM}
      />

      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerKey="dQw4w9WgXcQ"
        title="E2E Sample Trailer"
      />
    </div>
  );
};

export default E2EModals;
