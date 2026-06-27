import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { PlayerId, PlayerRow } from "../evolu/client";
import type { MatchSummary } from "../hooks/useLeagueData";
import type { MatchRecorderSelection } from "./MatchRecorder";
import { MatchHistory } from "./MatchHistory";

interface DuelsHistoryProps {
  readonly players: ReadonlyArray<PlayerRow>;
  readonly matches: ReadonlyArray<MatchSummary>;
  readonly activeSelection: MatchRecorderSelection;
}

export const DuelsHistory = ({
  players,
  matches,
  activeSelection,
}: DuelsHistoryProps) => {
  const { t } = useTranslation();

  const selectedPlayerIds = useMemo(
    () => getSelectedPlayerIds(activeSelection),
    [activeSelection],
  );

  const filteredMatches = useMemo(() => {
    if (selectedPlayerIds.length === 0) {
      return [];
    }

    if (activeSelection.mode === "singles" && selectedPlayerIds.length === 2) {
      const [firstPlayerId, secondPlayerId] = selectedPlayerIds;

      return matches.filter((match) => {
        const teamAIds = new Set(match.teamAPlayers.map((player) => player.id));
        const teamBIds = new Set(match.teamBPlayers.map((player) => player.id));

        return (
          (teamAIds.has(firstPlayerId) && teamBIds.has(secondPlayerId)) ||
          (teamAIds.has(secondPlayerId) && teamBIds.has(firstPlayerId))
        );
      });
    }

    return matches.filter((match) => {
      const playerIds = new Set(match.participants.map((participant) => participant.player.id));
      return selectedPlayerIds.every((playerId) => playerIds.has(playerId));
    });
  }, [activeSelection.mode, matches, selectedPlayerIds]);

  const headToHeadBalance = useMemo(() => {
    if (activeSelection.mode !== "singles" || selectedPlayerIds.length !== 2) {
      return null;
    }

    const [firstPlayerId, secondPlayerId] = selectedPlayerIds;
    const firstPlayer = players.find((player) => player.id === firstPlayerId);
    const secondPlayer = players.find((player) => player.id === secondPlayerId);
    const singlesMatches = filteredMatches.filter((match) => !match.isDoubles);

    if (!firstPlayer || !secondPlayer || singlesMatches.length === 0) {
      return null;
    }

    return singlesMatches.reduce(
      (balance, match) => {
        const firstPlayerTeam = match.teamAPlayers.some((player) => player.id === firstPlayerId)
          ? "A"
          : "B";

        if (firstPlayerTeam === match.winnerTeam) {
          return { ...balance, firstWins: balance.firstWins + 1 };
        }

        return { ...balance, secondWins: balance.secondWins + 1 };
      },
      {
        firstPlayer,
        secondPlayer,
        firstWins: 0,
        secondWins: 0,
      },
    );
  }, [activeSelection.mode, filteredMatches, players, selectedPlayerIds]);

  if (selectedPlayerIds.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-black/50">
        {t("Select at least one player to see matches.")}
      </p>
    );
  }

  if (filteredMatches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-black/50">
        {t("Let's play your first duel!")}
      </p>
    );
  }

  return (
    <>
      {headToHeadBalance && (
        <div
          role="group"
          aria-label={t("Head to head")}
          className="mb-4 border-b border-black/5 pb-4"
        >
          <p className="mb-2 text-xs font-medium text-black/40">
            {t("Head to head")}
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <p className="truncate text-right text-sm font-medium text-black">
              {headToHeadBalance.firstPlayer.name}
            </p>
            <p className="font-mono text-xl font-semibold text-black">
              <span className={getScoreClass(headToHeadBalance.firstWins, headToHeadBalance.secondWins)}>
                {headToHeadBalance.firstWins}
              </span><span className="mx-1 text-black/30">:</span><span className={getScoreClass(headToHeadBalance.secondWins, headToHeadBalance.firstWins)}>
                {headToHeadBalance.secondWins}
              </span>
            </p>
            <p className="truncate text-sm font-medium text-black">
              {headToHeadBalance.secondPlayer.name}
            </p>
          </div>
        </div>
      )}
      <MatchHistory matches={filteredMatches} />
    </>
  );
};

const getSelectedPlayerIds = (
  selection: MatchRecorderSelection,
): ReadonlyArray<PlayerId> => {
  const ids =
    selection.mode === "doubles"
      ? [
        selection.playerAId,
        selection.playerA2Id,
        selection.playerBId,
        selection.playerB2Id,
      ]
      : [selection.playerAId, selection.playerBId];

  return [...new Set(ids.filter((id): id is PlayerId => id !== ""))];
};

const getScoreClass = (wins: number, opponentWins: number): string => {
  if (wins > opponentWins) return "text-emerald-600";
  if (wins < opponentWins) return "text-orange-500";
  return "text-black";
};
