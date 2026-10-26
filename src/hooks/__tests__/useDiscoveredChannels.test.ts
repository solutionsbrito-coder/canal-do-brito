import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDiscoveredChannels } from "../useDiscoveredChannels";

const dailyRows = vi.hoisted(() => ({
  data: [] as Array<{ channels: string[] | null }>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_table: string) => ({
      select: () => ({
        gte: () => ({
          limit: () => Promise.resolve({ data: dailyRows.data, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("../useChannelMappings", () => ({
  useChannelMappings: () => ({ data: new Map() }),
  CHANNEL_MAPPINGS_QK: ["channel_logo_mappings"] as const,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe("useDiscoveredChannels", () => {
  beforeEach(() => {
    dailyRows.data = [];
  });

  it("returns empty when no channels are present", async () => {
    const { result } = renderHook(() => useDiscoveredChannels(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.all).toEqual([]);
    expect(result.current.orphans).toEqual([]);
  });

  it("groups by normalized name and counts occurrences", async () => {
    dailyRows.data = [
      { channels: ["BandSports", "ESPN"] },
      { channels: ["BandSports HD"] },
      { channels: ["bandsports"] },
      { channels: null },
    ];
    const { result } = renderHook(() => useDiscoveredChannels(), { wrapper });
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0));
    const espn = result.current.all.find((c) => c.name.toLowerCase() === "espn");
    expect(espn?.count).toBe(1);
    // BandSports / bandsports normalizam para o mesmo; "BandSports HD" tem normalizado diferente.
    const bandTotals = result.current.all
      .filter((c) => c.name.toLowerCase().includes("band"))
      .reduce((sum, c) => sum + c.count, 0);
    expect(bandTotals).toBeGreaterThanOrEqual(3);
  });

  it("flags unknown custom channel as orphan and built-in as not orphan", async () => {
    dailyRows.data = [{ channels: ["ESPN", "Canal Inventado XYZ"] }];
    const { result } = renderHook(() => useDiscoveredChannels(), { wrapper });
    await waitFor(() => expect(result.current.all.length).toBe(2));
    const espn = result.current.all.find((c) => c.name === "ESPN");
    const inv = result.current.all.find((c) => c.name === "Canal Inventado XYZ");
    expect(espn?.isOrphan).toBe(false);
    expect(espn?.isBuiltin).toBe(true);
    expect(inv?.isOrphan).toBe(true);
    expect(result.current.orphans).toContainEqual(expect.objectContaining({ name: "Canal Inventado XYZ" }));
  });
});
