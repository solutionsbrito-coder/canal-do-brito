import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentCard } from "../ContentCard";
import type { NewsRelease } from "@/hooks/useNewsReleases";

const item: NewsRelease = {
  id: "1",
  title: "Teste do Filme",
  content_type: "movie",
  badge_type: "lancamento",
  image_url: "https://example.com/p.jpg",
  overview: null,
  year: 2026,
  rating: 8.5,
  tmdb_id: 100,
  active: true,
  display_order: 0,
  added_by: null,
  created_at: new Date().toISOString(),
  genres: null,
  runtime: null,
  seasons: null,
  tagline: null,
  backdrop_url: null,
};

describe("ContentCard", () => {
  it("renders title, year, type label and rating", () => {
    render(<ContentCard item={item} onSelect={() => {}} />);
    expect(screen.getByText("Teste do Filme")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.getByText("🎬 Filme")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<ContentCard item={item} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it("shows fallback icon when no image_url", () => {
    const noImg = { ...item, image_url: null };
    const { container } = render(<ContentCard item={noImg} onSelect={() => {}} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
