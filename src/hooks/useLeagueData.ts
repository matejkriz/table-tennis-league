import { useMemo } from "react";

import { allPlayersQuery, matchesQuery, playersQuery, useQuery } from "../evolu/client";
import type { AllPlayerRow, MatchRow, PlayerRow } from "../evolu/client";
import {
  calculateTeamMatchRatingDeltas,
  getMatchTeamDetails,
  type WinnerTeam,
} from "../utils/matchRating";

export const K_FACTOR = 16;

export interface MatchSummary {
  readonly match: MatchRow;
  readonly isDoubles: boolean;
  readonly winnerTeam: WinnerTeam;
  readonly teamAPlayers: ReadonlyArray<PlayerRow>;
  readonly teamBPlayers: ReadonlyArray<PlayerRow>;
  readonly participants: ReadonlyArray<{
    readonly player: PlayerRow;
    readonly team: WinnerTeam;
    readonly ratingBefore: number;
    readonly ratingAfter: number;
    readonly delta: number;
  }>;
  readonly players: {
    readonly a?: PlayerRow;
    readonly b?: PlayerRow;
    readonly aTeammate?: PlayerRow;
    readonly bTeammate?: PlayerRow;
  };
  readonly ratingBefore: {
    readonly a?: number;
    readonly b?: number;
    readonly aTeammate?: number;
    readonly bTeammate?: number;
  };
  readonly ratingAfter: {
    readonly a?: number;
    readonly b?: number;
    readonly aTeammate?: number;
    readonly bTeammate?: number;
  };
  readonly delta: {
    readonly a?: number;
    readonly b?: number;
    readonly aTeammate?: number;
    readonly bTeammate?: number;
  };
}

export interface RankingEntry {
  readonly player: PlayerRow;
  readonly rating: number;
  readonly delta: number;
  readonly matchCount: number;
}

export interface LeagueData {
  readonly players: ReadonlyArray<PlayerRow>;
  readonly playersById: Map<AllPlayerRow["id"], AllPlayerRow>;
  readonly matches: ReadonlyArray<MatchSummary>;
  readonly ranking: ReadonlyArray<RankingEntry>;
}

export const useLeagueData = (): LeagueData => {
  const players = useQuery(playersQuery);
  const allPlayers = useQuery(allPlayersQuery);
  const matches = useQuery(matchesQuery);

  return useMemo(() => {
    const playersById = new Map<AllPlayerRow["id"], AllPlayerRow>();
    allPlayers.forEach((player) => {
      playersById.set(player.id, player);
    });

    const ratingState = new Map<
      AllPlayerRow["id"],
      { rating: number; initial: number; matchCount: number }
    >();

    allPlayers.forEach((player) => {
      ratingState.set(player.id, {
        rating: player.initialRating,
        initial: player.initialRating,
        matchCount: 0,
      });
    });

    const sortedMatches = [...matches].sort((a, b) =>
      a.playedAt.localeCompare(b.playedAt),
    );

    const summaries: MatchSummary[] = [];

    sortedMatches.forEach((match) => {
      const details = getMatchTeamDetails(match);
      if (!details) return;

      const teamAPlayers = details.teamAPlayerIds
        .map((id) => playersById.get(id))
        .filter((player): player is AllPlayerRow => player != null);
      const teamBPlayers = details.teamBPlayerIds
        .map((id) => playersById.get(id))
        .filter((player): player is AllPlayerRow => player != null);

      if (
        teamAPlayers.length !== details.teamAPlayerIds.length ||
        teamBPlayers.length !== details.teamBPlayerIds.length
      ) {
        return;
      }

      const ratings = new Map<PlayerRow["id"], number>();
      [...teamAPlayers, ...teamBPlayers].forEach((player) => {
        const state = ratingState.get(player.id);
        if (state) {
          ratings.set(player.id, state.rating);
        }
      });

      const ratingResult = calculateTeamMatchRatingDeltas({
        teamAPlayerIds: details.teamAPlayerIds,
        teamBPlayerIds: details.teamBPlayerIds,
        winnerTeam: details.winnerTeam,
        ratings,
        kFactor: K_FACTOR,
      });
      if (!ratingResult) return;

      const participantById = new Map<
        PlayerRow["id"],
        {
          player: PlayerRow;
          team: WinnerTeam;
          ratingBefore: number;
          ratingAfter: number;
          delta: number;
        }
      >();

      const applyRating = (player: AllPlayerRow, team: WinnerTeam) => {
        const state = ratingState.get(player.id);
        const delta = ratingResult.playerDeltas.get(player.id);
        if (!state || delta == null) return;

        const ratingBefore = state.rating;
        const ratingAfter = ratingBefore + delta;

        state.rating = ratingAfter;
        state.matchCount += 1;

        participantById.set(player.id, {
          player,
          team,
          ratingBefore,
          ratingAfter,
          delta,
        });
      };

      teamAPlayers.forEach((player) => applyRating(player, "A"));
      teamBPlayers.forEach((player) => applyRating(player, "B"));

      const playerA = teamAPlayers[0];
      const playerATeammate = teamAPlayers[1];
      const playerB = teamBPlayers[0];
      const playerBTeammate = teamBPlayers[1];

      const playerAResult = participantById.get(playerA.id);
      const playerATeammateResult = playerATeammate
        ? participantById.get(playerATeammate.id)
        : undefined;
      const playerBResult = participantById.get(playerB.id);
      const playerBTeammateResult = playerBTeammate
        ? participantById.get(playerBTeammate.id)
        : undefined;

      if (!playerAResult || !playerBResult) return;

      summaries.push({
        match,
        isDoubles: details.isDoubles,
        winnerTeam: details.winnerTeam,
        teamAPlayers,
        teamBPlayers,
        participants: [...participantById.values()],
        players: {
          a: playerA,
          b: playerB,
          aTeammate: playerATeammate,
          bTeammate: playerBTeammate,
        },
        ratingBefore: {
          a: playerAResult.ratingBefore,
          b: playerBResult.ratingBefore,
          aTeammate: playerATeammateResult?.ratingBefore,
          bTeammate: playerBTeammateResult?.ratingBefore,
        },
        ratingAfter: {
          a: playerAResult.ratingAfter,
          b: playerBResult.ratingAfter,
          aTeammate: playerATeammateResult?.ratingAfter,
          bTeammate: playerBTeammateResult?.ratingAfter,
        },
        delta: {
          a: playerAResult.delta,
          b: playerBResult.delta,
          aTeammate: playerATeammateResult?.delta,
          bTeammate: playerBTeammateResult?.delta,
        },
      });
    });

    const ranking: RankingEntry[] = players
      .map((player) => {
        const state = ratingState.get(player.id);
        const rating = state?.rating ?? player.initialRating;
        const initial = state?.initial ?? player.initialRating;
        const delta = rating - initial;
        const matchCount = state?.matchCount ?? 0;
        return { player, rating, delta, matchCount };
      })
      .sort((a, b) => b.rating - a.rating || a.player.name.localeCompare(b.player.name));

    return {
      players,
      playersById,
      matches: summaries,
      ranking,
    } satisfies LeagueData;
  }, [allPlayers, matches, players]);
};
