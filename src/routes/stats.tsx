import { createFileRoute } from "@tanstack/react-router";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { MatchHistory } from "../components/MatchHistory";
import { RankingList } from "../components/RankingList";
import { useLeagueData } from "../hooks/useLeagueData";

const StatsPage = () => {
  const { players, ranking, matches } = useLeagueData();

  const matchCount = matches.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          Table Tennis League
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-black/50">
          <span>{players.length} players</span>
          <span className="text-black/20">•</span>
          <span>{matchCount} matches</span>
        </div>
      </header>

      <div className="space-y-6">
        <CollapsibleSection
          storageKey="section-stats-ranking"
          title="Ranking"
          defaultOpen={true}
          headerRight="STR"
        >
          <RankingList ranking={ranking} />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-stats-match-history"
          title="Match history"
          defaultOpen={true}
        >
          <MatchHistory matches={matches} readonly />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/stats")({
  component: StatsPage,
});
