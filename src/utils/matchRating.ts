import type { MatchRow, PlayerId } from "../evolu/client";

export type WinnerTeam = "A" | "B";

interface TeamRatingInput {
  readonly teamAPlayerIds: ReadonlyArray<PlayerId>;
  readonly teamBPlayerIds: ReadonlyArray<PlayerId>;
  readonly winnerTeam: WinnerTeam;
  readonly ratings: ReadonlyMap<PlayerId, number>;
  readonly kFactor: number;
}

export interface TeamRatingResult {
  readonly teamAverageA: number;
  readonly teamAverageB: number;
  readonly expectedA: number;
  readonly expectedB: number;
  readonly teamDeltaA: number;
  readonly teamDeltaB: number;
  readonly playerDeltas: ReadonlyMap<PlayerId, number>;
}

const calculateExpectedScore = (ratingA: number, ratingB: number): number =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

const calculateSplitWeights = (
  ratings: ReadonlyArray<number>,
): ReadonlyArray<number> => {
  const total = ratings.reduce((sum, rating) => sum + Math.max(rating, 0), 0);
  if (total <= 0) {
    return ratings.map(() => 1 / ratings.length);
  }

  return ratings.map((rating) => Math.max(rating, 0) / total);
};

export const calculateTeamMatchRatingDeltas = ({
  teamAPlayerIds,
  teamBPlayerIds,
  winnerTeam,
  ratings,
  kFactor,
}: TeamRatingInput): TeamRatingResult | null => {
  if (teamAPlayerIds.length === 0 || teamBPlayerIds.length === 0) return null;

  const allIds = [...teamAPlayerIds, ...teamBPlayerIds];
  if (new Set(allIds).size !== allIds.length) return null;

  const teamARatings = teamAPlayerIds.map((id) => ratings.get(id));
  const teamBRatings = teamBPlayerIds.map((id) => ratings.get(id));
  if (
    teamARatings.some((rating) => rating == null) ||
    teamBRatings.some((rating) => rating == null)
  ) {
    return null;
  }

  const resolvedTeamARatings = teamARatings as number[];
  const resolvedTeamBRatings = teamBRatings as number[];

  const teamAverageA =
    resolvedTeamARatings.reduce((sum, rating) => sum + rating, 0) /
    resolvedTeamARatings.length;
  const teamAverageB =
    resolvedTeamBRatings.reduce((sum, rating) => sum + rating, 0) /
    resolvedTeamBRatings.length;

  const expectedA = calculateExpectedScore(teamAverageA, teamAverageB);
  const expectedB = 1 - expectedA;

  const actualA = winnerTeam === "A" ? 1 : 0;
  const actualB = 1 - actualA;

  const teamDeltaA = kFactor * (actualA - expectedA);
  const teamDeltaB = kFactor * (actualB - expectedB);

  const teamAWeights = calculateSplitWeights(resolvedTeamARatings);
  const teamBWeights = calculateSplitWeights(resolvedTeamBRatings);

  const playerDeltas = new Map<PlayerId, number>();

  teamAPlayerIds.forEach((id, index) => {
    playerDeltas.set(id, teamDeltaA * teamAWeights[index]);
  });
  teamBPlayerIds.forEach((id, index) => {
    playerDeltas.set(id, teamDeltaB * teamBWeights[index]);
  });

  return {
    teamAverageA,
    teamAverageB,
    expectedA,
    expectedB,
    teamDeltaA,
    teamDeltaB,
    playerDeltas,
  };
};

const parseWinnerTeam = (match: MatchRow): WinnerTeam | null => {
  if (match.winnerTeam === "A") {
    return "A";
  }
  if (match.winnerTeam === "B") {
    return "B";
  }
  if (match.winnerId === match.playerAId) return "A";
  if (match.winnerId === match.playerBId) return "B";
  return null;
};

export interface MatchTeamDetails {
  readonly teamAPlayerIds: ReadonlyArray<PlayerId>;
  readonly teamBPlayerIds: ReadonlyArray<PlayerId>;
  readonly winnerTeam: WinnerTeam;
  readonly isDoubles: boolean;
}

export const getMatchTeamDetails = (match: MatchRow): MatchTeamDetails | null => {
  const hasA2 = Boolean(match.playerA2Id);
  const hasB2 = Boolean(match.playerB2Id);
  if (hasA2 !== hasB2) return null;

  const teamAPlayerIds = match.playerA2Id
    ? [match.playerAId, match.playerA2Id]
    : [match.playerAId];
  const teamBPlayerIds = match.playerB2Id
    ? [match.playerBId, match.playerB2Id]
    : [match.playerBId];
  const winnerTeam = parseWinnerTeam(match);

  const allIds = [...teamAPlayerIds, ...teamBPlayerIds];
  if (new Set(allIds).size !== allIds.length) return null;
  if (!winnerTeam) return null;

  return {
    teamAPlayerIds,
    teamBPlayerIds,
    winnerTeam,
    isDoubles: Boolean(match.playerA2Id && match.playerB2Id),
  };
};
