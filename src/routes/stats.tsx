import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { MatchHistory } from "../components/MatchHistory";
import { RankingList } from "../components/RankingList";
import { useLeagueData } from "../hooks/useLeagueData";
import {
  useStatsRankingFilterPreference,
  type StatsRankingFilter,
} from "../hooks/useStatsRankingFilterPreference";

export const StatsPage = () => {
  const { t } = useTranslation();
  const { players, ranking, matches } = useLeagueData();
  const [rankingFilter, setRankingFilter] = useStatsRankingFilterPreference();

  const matchCount = matches.length;
  const filteredRanking = useMemo(() => {
    if (rankingFilter === "all") return ranking;

    const now = Date.now();
    const windowInDays = rankingFilter === "7d" ? 7 : 30;
    const cutoffTime = now - windowInDays * 24 * 60 * 60 * 1000;
    const latestMatchByPlayerId = new Map<string, number>();

    matches.forEach((summary) => {
      const playedAtTime = new Date(summary.match.playedAt).getTime();
      if (Number.isNaN(playedAtTime)) return;

      summary.participants.forEach(({ player }) => {
        const latestPlayedAtTime = latestMatchByPlayerId.get(player.id);
        if (latestPlayedAtTime == null || playedAtTime > latestPlayedAtTime) {
          latestMatchByPlayerId.set(player.id, playedAtTime);
        }
      });
    });

    return ranking.filter((entry) => {
      const latestPlayedAtTime = latestMatchByPlayerId.get(entry.player.id);
      return latestPlayedAtTime != null && latestPlayedAtTime >= cutoffTime;
    });
  }, [matches, ranking, rankingFilter]);
  const rankingEmptyStateMessage =
    rankingFilter === "all" ? undefined : t("No players played in this period.");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-40 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          {t("Table Tennis League")}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-black/50">
          <span>{players.length} {t("players")}</span>
          <span className="text-black/20">•</span>
          <span>{matchCount} {t("matches")}</span>
        </div>
      </header>

      <div className="space-y-6">
        <CollapsibleSection
          storageKey="section-stats-ranking"
          title={t("Ranking")}
          defaultOpen={true}
          headerRight={t("STR")}
        >
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
            <p className="text-sm font-medium text-black/60">
              {t("Last match in:")}
            </p>
            <fieldset
              aria-label={t("Last match in:")}
              className="inline-flex rounded-full bg-black/5 p-1"
            >
              <legend className="sr-only">{t("Last match in:")}</legend>
              {rankingFilterOptions.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="stats-ranking-filter"
                    value={option.value}
                    checked={rankingFilter === option.value}
                    onChange={() => setRankingFilter(option.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-w-[5.5rem] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-black/60 transition peer-checked:bg-[#F7931A] peer-checked:text-white">
                    {t(option.label)}
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
          <RankingList
            ranking={filteredRanking}
            emptyStateMessage={rankingEmptyStateMessage}
          />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-stats-match-history"
          title={t("Match history")}
          defaultOpen={true}
        >
          <MatchHistory matches={matches} readonly />
        </CollapsibleSection>
      </div>
    </div>
  );
};

const rankingFilterOptions: ReadonlyArray<{
  readonly value: StatsRankingFilter;
  readonly label: "7 days" | "30 days" | "Anytime";
}> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "Anytime" },
];

export const Route = createFileRoute("/stats")({
  component: StatsPage,
});
