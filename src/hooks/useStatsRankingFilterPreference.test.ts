import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../evolu/client", () => ({
  UiPreferenceId: {},
  uiPreferencesQuery: {},
  useEvolu: vi.fn(),
  useQuery: vi.fn(),
}));

import { useEvolu, useQuery } from "../evolu/client";
import { useStatsRankingFilterPreference } from "./useStatsRankingFilterPreference";

describe("useStatsRankingFilterPreference", () => {
  const insert = vi.fn();
  const update = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEvolu).mockReturnValue(
      { insert, update } as unknown as ReturnType<typeof useEvolu>,
    );
  });

  it("defaults to 30d when no preference is stored", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    const { result } = renderHook(() => useStatsRankingFilterPreference());

    expect(result.current[0]).toBe("30d");
  });

  it("inserts a new local preference when the filter changes for the first time", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    const { result } = renderHook(() => useStatsRankingFilterPreference());
    result.current[1]("7d");

    expect(insert).toHaveBeenCalledWith("_uiPreference", {
      key: "stats-ranking-activity-filter",
      isOpen: 0,
      value: "7d",
    });
  });

  it("updates the existing local preference when one is already stored", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        id: "pref-1",
        key: "stats-ranking-activity-filter",
        isOpen: 0,
        value: "30d",
      },
    ]);

    const { result } = renderHook(() => useStatsRankingFilterPreference());
    result.current[1]("all");

    expect(update).toHaveBeenCalledWith("_uiPreference", {
      id: "pref-1",
      value: "all",
    });
  });
});
