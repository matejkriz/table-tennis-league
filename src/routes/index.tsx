import { IconCheck } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { MatchHistory } from "../components/MatchHistory";
import { MatchRecorder } from "../components/MatchRecorder";
import { RankingList } from "../components/RankingList";
import type { PlayerId } from "../evolu/client";
import { useCollapsibleState } from "../hooks/useCollapsibleState";
import { useDoublesPreference } from "../hooks/useDoublesPreference";
import { useLeagueData } from "../hooks/useLeagueData";
import { shouldRedirectRootToStart } from "../utils/startAccess";

interface MatchRecordedPayload {
  readonly playedAt: string;
  readonly winnerLabel: string;
  readonly loserLabel: string;
}

interface MatchToast {
  readonly id: number;
  readonly winnerLabel: string;
  readonly loserLabel: string;
}

export const MatchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDoublesEnabled] = useDoublesPreference();
  const { players, ranking, matches } = useLeagueData();
  const [historyIsOpen, _toggleHistory, setHistoryIsOpen] = useCollapsibleState(
    "section-match-match-history",
    false,
  );
  const [toast, setToast] = useState<MatchToast | null>(null);
  const [pendingScrollPlayedAt, setPendingScrollPlayedAt] = useState<string | null>(
    null,
  );
  const [scrollToMatchId, setScrollToMatchId] = useState<string | undefined>(
    undefined,
  );
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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (!pendingScrollPlayedAt || matches.length === 0) return;

    const sortedNewestFirst = [...matches].sort((a, b) =>
      b.match.playedAt.localeCompare(a.match.playedAt),
    );
    const target =
      sortedNewestFirst.find((entry) => entry.match.playedAt === pendingScrollPlayedAt) ??
      sortedNewestFirst[0];

    if (!target) return;
    setScrollToMatchId(target.match.id);
    setPendingScrollPlayedAt(null);
  }, [matches, pendingScrollPlayedAt]);

  const handleMatchRecorded = (payload: MatchRecordedPayload) => {
    setHistoryIsOpen(true);
    setPendingScrollPlayedAt(payload.playedAt);
    setToast({
      id: Date.now(),
      winnerLabel: payload.winnerLabel,
      loserLabel: payload.loserLabel,
    });
  };

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
          <MatchRecorder
            currentRatings={ratingMap}
            players={players}
            matches={matches.map((m) => m.match)}
            mode="singles"
            onMatchRecorded={handleMatchRecorded}
          />
        </CollapsibleSection>

        {isDoublesEnabled && (
          <CollapsibleSection
            storageKey="section-match-record-doubles-match"
            title={t("Record doubles match")}
            defaultOpen={true}
          >
            <MatchRecorder
              currentRatings={ratingMap}
              players={players}
              matches={matches.map((m) => m.match)}
              mode="doubles"
              onMatchRecorded={handleMatchRecorded}
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          storageKey="section-match-match-history"
          title={t("Match history")}
          defaultOpen={false}
          isOpen={historyIsOpen}
          onToggle={setHistoryIsOpen}
        >
          <MatchHistory matches={matches} scrollToMatchId={scrollToMatchId} />
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

      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none fixed right-4 top-20 z-40 w-[min(92vw,24rem)] rounded-xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur sm:right-6 sm:top-24"
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7931A]/15 text-[#F7931A]">
              <IconCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black">{t("Match recorded")}</p>
              <p className="mt-1 text-sm text-black/70">
                {toast.winnerLabel} {t("defeated")} {toast.loserLabel}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: MatchPage,
});
