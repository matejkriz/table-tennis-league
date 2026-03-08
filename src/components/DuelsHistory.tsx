import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { PlayerId } from "../evolu/client";
import type { MatchSummary } from "../hooks/useLeagueData";
import type { MatchRecorderSelection } from "./MatchRecorder";
import { MatchHistory } from "./MatchHistory";

interface DuelsHistoryProps {
  readonly matches: ReadonlyArray<MatchSummary>;
  readonly activeSelection: MatchRecorderSelection;
}

export const DuelsHistory = ({
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

  return <MatchHistory matches={filteredMatches} />;
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
