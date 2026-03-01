import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MatchSummary, RankingEntry } from "../hooks/useLeagueData";
import {
  filterRankingByLastMatch,
  type RankingTimeFilter,
} from "../utils/rankingTimeFilter";

const TIME_FILTER_OPTIONS: ReadonlyArray<{
  readonly value: RankingTimeFilter;
  readonly label: string;
}> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "all", label: "Anytime" },
];

interface RankingListProps {
  readonly ranking: ReadonlyArray<RankingEntry>;
  readonly matches: ReadonlyArray<MatchSummary>;
}

export const RankingList = ({ ranking, matches }: RankingListProps) => {
  const { t } = useTranslation();
  const [timeFilter, setTimeFilter] = useState<RankingTimeFilter>("all");

  const filteredRanking = useMemo(
    () =>
      filterRankingByLastMatch({
        ranking,
        matches,
        timeFilter,
      }),
    [matches, ranking, timeFilter],
  );

  const showTimeFilters = ranking.length > 0;
  const emptyStateText =
    ranking.length === 0
      ? t("Add players and record a match to see the live table.")
      : t("No players have their last match in this period.");

  return (
    <div>
      {showTimeFilters && (
        <div
          className="mb-5 flex flex-wrap items-center gap-2"
          aria-label={t("Last match in:")}
          role="group"
        >
          <span className="text-xs font-medium text-black/60">{t("Last match in:")}</span>
          {TIME_FILTER_OPTIONS.map((option) => {
            const isActive = timeFilter === option.value;
            return (
              <button
                key={option.value}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-[#F7931A] bg-[#F7931A] text-white"
                    : "border-black/15 bg-white text-black/70 hover:border-black/30 hover:text-black"
                }`}
                type="button"
                onClick={() => setTimeFilter(option.value)}
                aria-pressed={isActive}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>
      )}

      {filteredRanking.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/50">{emptyStateText}</p>
      ) : (
        <ol className="divide-y divide-black/5">
          {filteredRanking.map((entry, index) => (
            <li key={entry.player.id} className="flex items-center gap-4 py-4 first:pt-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-black/20 bg-black/5 font-mono text-sm font-medium text-black">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-black">
                  {entry.player.name}
                </p>
                <p className="mt-0.5 text-xs text-black/50">
                  {entry.matchCount} {t("matches")} • {t("Start")} {entry.player.initialRating.toFixed(1)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-lg font-medium text-black">
                  {entry.rating.toFixed(1)}
                </p>
                <p className={`font-mono text-xs ${entry.delta > 0 ? "text-[#F7931A]" : "text-black/50"}`}>
                  {formatDelta(entry.delta)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

const formatDelta = (delta: number): string => {
  if (Number.isNaN(delta) || delta === 0) return "±0.0";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
};
