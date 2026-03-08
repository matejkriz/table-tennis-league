import { useCallback, useMemo } from "react";

import {
  UiPreferenceId,
  uiPreferencesQuery,
  useEvolu,
  useQuery,
} from "../evolu/client";

const STATS_RANKING_FILTER_PREFERENCE_KEY = "stats-ranking-activity-filter";

export type StatsRankingFilter = "7d" | "30d" | "all";

export const useStatsRankingFilterPreference = (): [
  StatsRankingFilter,
  (filter: StatsRankingFilter) => void,
] => {
  const { insert, update } = useEvolu();
  const rows = useQuery(uiPreferencesQuery);

  const preference = useMemo(
    () =>
      rows.find((row) => row.key === STATS_RANKING_FILTER_PREFERENCE_KEY),
    [rows],
  );

  const currentFilter = useMemo<StatsRankingFilter>(() => {
    if (preference?.value === "7d") return "7d";
    if (preference?.value === "30d") return "30d";
    if (preference?.value === "all") return "all";
    return "30d";
  }, [preference?.value]);

  const setFilter = useCallback(
    (filter: StatsRankingFilter) => {
      if (preference) {
        update("_uiPreference", {
          id: preference.id as UiPreferenceId,
          value: filter,
        });
        return;
      }

      insert("_uiPreference", {
        key: STATS_RANKING_FILTER_PREFERENCE_KEY,
        isOpen: 0 as const,
        value: filter,
      });
    },
    [insert, preference, update],
  );

  return [currentFilter, setFilter];
};
