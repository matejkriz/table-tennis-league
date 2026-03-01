export type RankingTimeFilter = "all" | "week" | "month" | "quarter";

interface RankingEntryLike {
  readonly player: {
    readonly id: string;
  };
}

interface MatchSummaryLike {
  readonly match: {
    readonly playedAt: string;
  };
  readonly participants: ReadonlyArray<{
    readonly player: {
      readonly id: string;
    };
  }>;
}

interface FilterRankingByLastMatchParams<
  TRankingEntry extends RankingEntryLike,
  TMatchSummary extends MatchSummaryLike,
> {
  readonly ranking: ReadonlyArray<TRankingEntry>;
  readonly matches: ReadonlyArray<TMatchSummary>;
  readonly timeFilter: RankingTimeFilter;
  readonly now?: Date;
}

export const filterRankingByLastMatch = <
  TRankingEntry extends RankingEntryLike,
  TMatchSummary extends MatchSummaryLike,
>({
  ranking,
  matches,
  timeFilter,
  now = new Date(),
}: FilterRankingByLastMatchParams<TRankingEntry, TMatchSummary>): ReadonlyArray<TRankingEntry> => {
  if (timeFilter === "all") {
    return ranking;
  }

  const threshold = getFilterThreshold(timeFilter, now);
  const latestMatchByPlayer = getLatestMatchTimestampByPlayer(matches);

  return ranking.filter((entry) => {
    const lastMatchTimestamp = latestMatchByPlayer.get(entry.player.id);
    return lastMatchTimestamp != null && lastMatchTimestamp >= threshold;
  });
};

const getLatestMatchTimestampByPlayer = <TMatchSummary extends MatchSummaryLike>(
  matches: ReadonlyArray<TMatchSummary>,
): Map<string, number> => {
  const latestMatchByPlayer = new Map<string, number>();

  matches.forEach((summary) => {
    const playedAtTimestamp = Date.parse(summary.match.playedAt);
    if (Number.isNaN(playedAtTimestamp)) return;

    summary.participants.forEach((participant) => {
      const previousTimestamp = latestMatchByPlayer.get(participant.player.id);
      if (previousTimestamp == null || playedAtTimestamp > previousTimestamp) {
        latestMatchByPlayer.set(participant.player.id, playedAtTimestamp);
      }
    });
  });

  return latestMatchByPlayer;
};

const getFilterThreshold = (timeFilter: Exclude<RankingTimeFilter, "all">, now: Date): number => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (timeFilter) {
    case "week": {
      const day = start.getDay();
      const daysSinceMonday = (day + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
      break;
    }
    case "month":
      start.setDate(1);
      break;
    case "quarter": {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      break;
    }
  }

  return start.getTime();
};
