import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentListItem } from "../ContentListItem";
import type { NewsRelease } from "@/hooks/useNewsReleases";

const item: NewsRelease = {
  id: "1",
  title: "Série Teste",
  content_type: "series",
  badge_type: "nova_temporada",
  image_url: "https://example.com/p.jpg",
  overview: "Sinopse curta",
  year: 2025,
  rating: 7.2,
  tmdb_id: 200,
  active: true,
  display_order: 0,
  added_by: null,
  created_at: new Date().toISOString(),
  genres: null,
  runtime: null,
  seasons: 2,
  tagline: null,
  backdrop_url: null,
};

describe("ContentListItem", () => {
  it("renders title, badge, type label, year and rating", () => {
    render(<ContentListItem item={item} onSelect={() => {}} />);
    expect(screen.getByText("Série Teste")).toBeInTheDocument();
    expect(screen.getByText("Nova Temporada")).toBeInTheDocument();
    expect(screen.getByText("📺 Série")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("7.2")).toBeInTheDocument();
    expect(screen.getByText("Sinopse curta")).toBeInTheDocument();
  });

  it("invokes onSelect with the item", () => {
    const onSelect = vi.fn();
    render(<ContentListItem item={item} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(item);
  });
});
