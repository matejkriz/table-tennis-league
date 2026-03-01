import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { MatchHistory } from "../components/MatchHistory";
import { MatchRecorder } from "../components/MatchRecorder";
import { RankingList } from "../components/RankingList";
import type { PlayerId } from "../evolu/client";
import { useLeagueData } from "../hooks/useLeagueData";
import { shouldRedirectRootToStart } from "../utils/startAccess";

const MatchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players, ranking, matches } = useLeagueData();
  const shouldRedirectToStart = shouldRedirectRootToStart({
    matchCount: matches.length,
    playerCount: players.length,
  });

  const ratingMap = useMemo(() => {
    const map = new Map<PlayerId, number>();
    ranking.forEach((entry) => {
      map.set(entry.player.id, entry.rating);
    });
    return map;
  }, [ranking]);

  useEffect(() => {
    if (shouldRedirectToStart) {
      void navigate({ to: "/start" });
    }
  }, [navigate, shouldRedirectToStart]);

  if (shouldRedirectToStart) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-40 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          {t("Record Match")}
        </h1>
      </header>

      <div className="space-y-6">
        <CollapsibleSection
          storageKey="section-match-record-match"
          title={t("Record match")}
          defaultOpen={true}
        >
          <MatchRecorder currentRatings={ratingMap} players={players} matches={matches.map(m => m.match)} />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-match-match-history"
          title={t("Match history")}
          defaultOpen={false}
        >
          <MatchHistory matches={matches} />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-match-ranking"
          title={t("Ranking")}
          defaultOpen={false}
          headerRight={t("STR")}
        >
          <RankingList ranking={ranking} />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: MatchPage,
});
