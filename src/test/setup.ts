import "@testing-library/jest-dom";
import { vi } from "vitest";

// Default global mock so components that render <ChannelBadge/> in tests
// don't require a QueryClientProvider just for channel logo lookups.
// Individual tests can still vi.mock(...) to override.
vi.mock("@/hooks/useChannelMappings", () => ({
  useChannelMappings: () => ({ data: new Map() }),
  CHANNEL_MAPPINGS_QK: ["channel_logo_mappings"] as const,
}));

// Mock useWatchProgress globally since ContentDetailSheet now uses it
// to track views for Continue Watching.
vi.mock("@/hooks/useWatchProgress", () => ({
  useWatchProgress: () => ({ data: [], isLoading: false }),
  useUpsertProgress: () => ({ mutate: vi.fn() }),
  useDeleteProgress: () => ({ mutate: vi.fn() }),
}));

// Polyfill ResizeObserver for jsdom (used by Recharts)
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
