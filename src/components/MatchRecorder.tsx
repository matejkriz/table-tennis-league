import * as Evolu from "@evolu/common";
import { IconMoodSad, IconTrophy } from "@tabler/icons-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MatchRow, PlayerId, PlayerRow } from "../evolu/client";
import { formatTypeError, useEvolu } from "../evolu/client";
import { K_FACTOR, useLeagueData } from "../hooks/useLeagueData";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  calculateTeamMatchRatingDeltas,
  type WinnerTeam,
} from "../utils/matchRating";
import {
  reconcileSelectionIds,
  selectionIdsMatch,
} from "../utils/reconcileSelection";
import { CollapsibleSection } from "./CollapsibleSection";
import { RatingChart } from "./RatingChart";

const PLAYER_A_COLOR = "#F7931A";
const PLAYER_B_COLOR = "#3B82F6";

const SELECT_CLASS =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20";

type PlayerSlot = readonly [PlayerId | "", (id: PlayerId | "") => void];

const handlePlayerChange = (
  setSelf: (id: PlayerId | "") => void,
  opposingSlots: ReadonlyArray<PlayerSlot>,
) => (event: ChangeEvent<HTMLSelectElement>) => {
  const id = event.target.value as PlayerId | "";
  setSelf(id);
  if (id) {
    for (const [currentId, setter] of opposingSlots) {
      if (id === currentId) setter("");
    }
  }
};

interface PlayerSelectProps {
  readonly label: string;
  readonly value: PlayerId | "";
  readonly options: ReadonlyArray<PlayerRow>;
  readonly onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly placeholder: string;
}

const PlayerSelect = ({ label, value, options, onChange, placeholder }: PlayerSelectProps) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
      {label}
    </span>
    <select className={SELECT_CLASS} value={value} onChange={onChange}>
      <option value="">{placeholder}</option>
      {options.map((player) => (
        <option key={player.id} value={player.id}>
          {player.name}
        </option>
      ))}
    </select>
  </label>
);

interface MatchRecorderProps {
  readonly players: ReadonlyArray<PlayerRow>;
  readonly currentRatings: ReadonlyMap<PlayerId, number>;
  readonly matches: ReadonlyArray<MatchRow>;
  readonly mode?: "singles" | "doubles";
  readonly onSelectionChange?: (selection: MatchRecorderSelection) => void;
}

export interface MatchRecorderSinglesSelection {
  readonly mode: "singles";
  readonly playerAId: PlayerId | "";
  readonly playerBId: PlayerId | "";
}

export interface MatchRecorderDoublesSelection {
  readonly mode: "doubles";
  readonly playerAId: PlayerId | "";
  readonly playerA2Id: PlayerId | "";
  readonly playerBId: PlayerId | "";
  readonly playerB2Id: PlayerId | "";
}

export type MatchRecorderSelection =
  | MatchRecorderSinglesSelection
  | MatchRecorderDoublesSelection;

export const MatchRecorder = ({
  players,
  currentRatings,
  matches,
  mode = "singles",
  onSelectionChange,
}: MatchRecorderProps) => {
  const { t } = useTranslation();
  const { insert } = useEvolu();
  const isDoublesMode = mode === "doubles";
  const { enqueueMatchNotification } = usePushNotifications();
  const leagueData = useLeagueData();
  const [playerAId, setPlayerAId] = useState<PlayerId | "">(
    players[0]?.id ?? "",
  );
  const [playerBId, setPlayerBId] = useState<PlayerId | "">(
    players[1]?.id ?? "",
  );
  const [playerA2Id, setPlayerA2Id] = useState<PlayerId | "">("");
  const [playerB2Id, setPlayerB2Id] = useState<PlayerId | "">("");
  const [winnerTeam, setWinnerTeam] = useState<WinnerTeam | null>("A");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (isDoublesMode) {
      const currentSelectionIds = [playerAId, playerA2Id, playerBId, playerB2Id];
      const nextSelectionIds = reconcileSelectionIds(players, currentSelectionIds);
      if (selectionIdsMatch(currentSelectionIds, nextSelectionIds)) {
        return;
      }

      setPlayerAId(nextSelectionIds[0]);
      setPlayerA2Id(nextSelectionIds[1]);
      setPlayerBId(nextSelectionIds[2]);
      setPlayerB2Id(nextSelectionIds[3]);
      return;
    }

    const currentSelectionIds = [playerAId, playerBId];
    const nextSelectionIds = reconcileSelectionIds(players, currentSelectionIds);
    if (selectionIdsMatch(currentSelectionIds, nextSelectionIds)) {
      return;
    }

    setPlayerAId(nextSelectionIds[0]);
    setPlayerBId(nextSelectionIds[1]);
  }, [players]);

  useEffect(() => {
    if (!successToast) return;
    const timeoutId = window.setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [successToast]);

  useEffect(() => {
    if (!onSelectionChange) return;

    if (isDoublesMode) {
      onSelectionChange({
        mode: "doubles",
        playerAId,
        playerA2Id,
        playerBId,
        playerB2Id,
      });
      return;
    }

    onSelectionChange({
      mode: "singles",
      playerAId,
      playerBId,
    });
  }, [
    isDoublesMode,
    onSelectionChange,
    playerA2Id,
    playerAId,
    playerB2Id,
    playerBId,
  ]);

  const playersById = useMemo(() => {
    const map = new Map<PlayerId, PlayerRow>();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const getPlayerOptions = (
    currentId: PlayerId | "",
    blockedIds: ReadonlyArray<PlayerId | "">,
  ): ReadonlyArray<PlayerRow> => {
    const blocked = new Set(
      blockedIds.filter((id): id is PlayerId => id !== ""),
    );
    return players.filter(
      (player) => player.id === currentId || !blocked.has(player.id),
    );
  };

  const teamSelection = useMemo(() => {
    if (!playerAId || !playerBId) return null;

    const teamAPlayerIds = isDoublesMode
      ? playerA2Id
        ? [playerAId, playerA2Id]
        : []
      : [playerAId];
    const teamBPlayerIds = isDoublesMode
      ? playerB2Id
        ? [playerBId, playerB2Id]
        : []
      : [playerBId];

    if (teamAPlayerIds.length === 0 || teamBPlayerIds.length === 0) {
      return null;
    }

    const allIds = [...teamAPlayerIds, ...teamBPlayerIds];
    if (new Set(allIds).size !== allIds.length) {
      return null;
    }

    return { teamAPlayerIds, teamBPlayerIds };
  }, [isDoublesMode, playerA2Id, playerAId, playerB2Id, playerBId]);

  const teamLabels = useMemo(() => {
    if (!teamSelection) {
      return null;
    }

    const teamALabel = teamSelection.teamAPlayerIds
      .map((id) => playersById.get(id)?.name)
      .filter((name): name is PlayerRow["name"] => name != null)
      .join(" + ");
    const teamBLabel = teamSelection.teamBPlayerIds
      .map((id) => playersById.get(id)?.name)
      .filter((name): name is PlayerRow["name"] => name != null)
      .join(" + ");

    if (!teamALabel || !teamBLabel) {
      return null;
    }

    return { teamALabel, teamBLabel };
  }, [playersById, teamSelection]);

  const preview = useMemo(() => {
    if (!teamSelection || winnerTeam == null || !teamLabels) {
      return null;
    }

    const ratingResult = calculateTeamMatchRatingDeltas({
      teamAPlayerIds: teamSelection.teamAPlayerIds,
      teamBPlayerIds: teamSelection.teamBPlayerIds,
      winnerTeam,
      ratings: currentRatings,
      kFactor: K_FACTOR,
    });
    if (!ratingResult) return null;

    const participants = [
      ...teamSelection.teamAPlayerIds.map((id) => ({ id, team: "A" as const })),
      ...teamSelection.teamBPlayerIds.map((id) => ({ id, team: "B" as const })),
    ]
      .map((entry) => {
        const player = playersById.get(entry.id);
        const ratingBefore = currentRatings.get(entry.id);
        const delta = ratingResult.playerDeltas.get(entry.id);
        if (!player || ratingBefore == null || delta == null) return null;
        return {
          ...entry,
          player,
          ratingBefore,
          delta,
          ratingAfter: ratingBefore + delta,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          id: PlayerId;
          team: WinnerTeam;
          player: PlayerRow;
          ratingBefore: number;
          delta: number;
          ratingAfter: number;
        } => entry != null,
      );

    if (
      participants.length !==
      teamSelection.teamAPlayerIds.length + teamSelection.teamBPlayerIds.length
    ) {
      return null;
    }

    return {
      ...ratingResult,
      participants,
      ...teamLabels,
      teamAPlayerIds: teamSelection.teamAPlayerIds,
      teamBPlayerIds: teamSelection.teamBPlayerIds,
    };
  }, [currentRatings, playersById, teamLabels, teamSelection, winnerTeam]);

  const resetForm = () => {
    setNote("");
    setError(null);
    setWinnerTeam(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!playerAId || !playerBId) {
      setError(t("Choose two players."));
      return;
    }

    if (isDoublesMode && (!playerA2Id || !playerB2Id)) {
      setError(t("Choose four players for doubles."));
      return;
    }

    const selectedIds = [
      playerAId,
      playerBId,
      ...(isDoublesMode ? [playerA2Id, playerB2Id] : []),
    ].filter((id): id is PlayerId => id !== "");

    if (new Set(selectedIds).size !== selectedIds.length) {
      setError(t("Players must be different."));
      return;
    }

    if (!preview) {
      setError(t("Select valid teams."));
      return;
    }

    const playedAtResult = Evolu.dateToDateIso(new Date());
    if (!playedAtResult.ok) {
      setError(formatTypeError(playedAtResult.error));
      return;
    }

    const trimmedNote = note.trim();
    const winnerId = (winnerTeam === "A" ? playerAId : playerBId) as PlayerId;
    const projectedRatings = new Map(currentRatings);
    preview.participants.forEach((participant) => {
      projectedRatings.set(participant.id, participant.ratingAfter);
    });

    // Calculate projected rankings based on new ratings
    const projectedRankings = [...leagueData.ranking]
      .map((entry) => {
        const projectedRating = projectedRatings.get(entry.player.id);
        if (projectedRating != null) {
          return { ...entry, rating: projectedRating };
        }
        return entry;
      })
      .sort((a, b) => b.rating - a.rating || a.player.name.localeCompare(b.player.name));

    const findRank = (id: PlayerId): number =>
      projectedRankings.findIndex((entry) => entry.player.id === id) + 1;

    const teamARankCandidates = preview.teamAPlayerIds
      .map((id) => findRank(id))
      .filter((rank) => rank > 0);
    const teamBRankCandidates = preview.teamBPlayerIds
      .map((id) => findRank(id))
      .filter((rank) => rank > 0);

    const teamARank =
      teamARankCandidates.length > 0 ? Math.min(...teamARankCandidates) : 0;
    const teamBRank =
      teamBRankCandidates.length > 0 ? Math.min(...teamBRankCandidates) : 0;

    const teamAAverageAfter = preview.teamAverageA + preview.teamDeltaA;
    const teamBAverageAfter = preview.teamAverageB + preview.teamDeltaB;
    const winnerLabel = winnerTeam === "A" ? preview.teamALabel : preview.teamBLabel;

    const insertResult = insert(
      "match",
      {
        playerAId,
        playerBId,
        playerA2Id: isDoublesMode ? playerA2Id : null,
        playerB2Id: isDoublesMode ? playerB2Id : null,
        winnerId,
        winnerTeam: isDoublesMode ? winnerTeam : null,
        playedAt: playedAtResult.value,
        note: trimmedNote.length > 0 ? trimmedNote : null,
      },
      {
        onComplete: () => {
          resetForm();
          setSuccessToast(t("Match recorded."));

          void enqueueMatchNotification({
            playedAt: playedAtResult.value,
            isDoubles: isDoublesMode,
            playerAName: preview.teamALabel,
            playerBName: preview.teamBLabel,
            winnerName: winnerLabel,
            playerARating: Math.round(teamAAverageAfter),
            playerBRating: Math.round(teamBAverageAfter),
            playerARank: teamARank,
            playerBRank: teamBRank,
          });
        },
      },
    );

    if (!insertResult.ok) {
      setError(formatTypeError(insertResult.error));
    }
  };

  const minPlayersRequired = isDoublesMode ? 4 : 2;
  if (players.length < minPlayersRequired) {
    return (
      <p className="py-8 text-center text-sm text-black/50">
        {isDoublesMode
          ? t("Add at least four players to record a doubles match.")
          : t("Add at least two players to record a match.")}
      </p>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {isDoublesMode ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-5">
            <PlayerSelect
              label={t("Team A - player 1")}
              value={playerAId}
              options={getPlayerOptions(playerAId, [playerA2Id])}
              onChange={handlePlayerChange(setPlayerAId, [[playerBId, setPlayerBId], [playerB2Id, setPlayerB2Id]])}
              placeholder={t("Select player")}
            />
            <PlayerSelect
              label={t("Team A - player 2")}
              value={playerA2Id}
              options={getPlayerOptions(playerA2Id, [playerAId])}
              onChange={handlePlayerChange(setPlayerA2Id, [[playerBId, setPlayerBId], [playerB2Id, setPlayerB2Id]])}
              placeholder={t("Select player")}
            />
          </div>
          <div className="space-y-5 border-t border-black/10 pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <PlayerSelect
              label={t("Team B - player 1")}
              value={playerBId}
              options={getPlayerOptions(playerBId, [playerB2Id])}
              onChange={handlePlayerChange(setPlayerBId, [[playerAId, setPlayerAId], [playerA2Id, setPlayerA2Id]])}
              placeholder={t("Select player")}
            />
            <PlayerSelect
              label={t("Team B - player 2")}
              value={playerB2Id}
              options={getPlayerOptions(playerB2Id, [playerBId])}
              onChange={handlePlayerChange(setPlayerB2Id, [[playerAId, setPlayerAId], [playerA2Id, setPlayerA2Id]])}
              placeholder={t("Select player")}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <PlayerSelect
            label={t("Player A")}
            value={playerAId}
            options={players}
            onChange={handlePlayerChange(setPlayerAId, [[playerBId, setPlayerBId]])}
            placeholder={t("Select player")}
          />
          <PlayerSelect
            label={t("Player B")}
            value={playerBId}
            options={players}
            onChange={handlePlayerChange(setPlayerBId, [[playerAId, setPlayerAId]])}
            placeholder={t("Select player")}
          />
        </div>
      )}

      {teamLabels && (
        <div className="border-t border-black/10 pt-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Winner")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: "A" as const,
                label: teamLabels.teamALabel,
                color: PLAYER_A_COLOR,
              },
              {
                id: "B" as const,
                label: teamLabels.teamBLabel,
                color: PLAYER_B_COLOR,
              },
            ]
              .map((item) => {
                const color = item.color;
                const isSelected = winnerTeam === item.id;
                const isLoser = winnerTeam !== null && winnerTeam !== item.id;

                // Inline styles for dynamic colors
                const selectedStyles = isSelected
                  ? {
                    borderColor: color,
                    backgroundColor: `${color}1A`, // 10% opacity in hex
                    boxShadow: `0 10px 15px -3px ${color}33, 0 4px 6px -4px ${color}33`,
                  }
                  : {};

                const iconStyles = isSelected
                  ? { backgroundColor: color, color: "white" }
                  : isLoser
                    ? { backgroundColor: "#F3F4F6", color: "#9CA3AF" }
                    : {};

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWinnerTeam(item.id)}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all ${!isSelected
                      ? "border-black/10 bg-white hover:border-black/20 hover:bg-black/5"
                      : ""
                      }`}
                    style={selectedStyles}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                      style={iconStyles}
                    >
                      {isSelected ? (
                        <IconTrophy size={22} stroke={2} />
                      ) : isLoser ? (
                        <IconMoodSad size={22} stroke={2} />
                      ) : (
                        <IconTrophy size={22} stroke={2} />
                      )}
                    </div>
                    <span
                      className={`text-lg transition-all ${isSelected ? "font-bold" : "font-medium text-black/70"
                        }`}
                      style={isSelected ? { color } : {}}
                    >
                      {item.label}
                    </span>
                    {isSelected && (
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color }}
                      >
                        {t("Winner")}
                      </span>
                    )}
                    {isLoser && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {t("Loser")}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {preview && (
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Optional note")}
          </span>
          <textarea
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm placeholder:text-black/40 transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
            maxLength={1000}
            placeholder={t("Score, highlights, etc.")}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      )}

      {!isDoublesMode && (playerAId || playerBId) && (
        <CollapsibleSection
          storageKey="match-recorder-rating-history"
          title={t("Rating history (90 days)")}
          defaultOpen={false}
        >
          <RatingChart
            matches={matches}
            players={players}
            playerAId={playerAId}
            playerBId={playerBId}
            currentRatings={currentRatings}
            projectedDeltaA={preview?.teamDeltaA ?? 0}
            projectedDeltaB={preview?.teamDeltaB ?? 0}
            winnerId={
              winnerTeam === "A"
                ? playerAId
                : winnerTeam === "B"
                  ? playerBId
                  : ""
            }
          />
        </CollapsibleSection>
      )}

      {preview && (
        <div className="rounded border border-black/10 bg-black/5 p-4 text-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Projected change")}
          </p>
          <div className="space-y-2 font-mono text-xs text-black/80">
            {preview.participants.map((participant) => (
              <p key={participant.id}>
                {participant.player.name}:{" "}
                <span className={participant.delta > 0 ? "text-[#F7931A]" : ""}>
                  {formatDelta(participant.delta)}
                </span>{" "}
                ({participant.ratingBefore.toFixed(1)} →{" "}
                {participant.ratingAfter.toFixed(1)})
              </p>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-black/60">{error}</p>}

      {preview && (
        <div className="flex justify-end pt-2">
          <button
            className="rounded-full bg-[#F7931A] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#F7931A]/90 hover:shadow-lg active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/50"
            type="submit"
          >
            {t("Record match")}
          </button>
        </div>
      )}

      {successToast && (
        <div aria-live="polite" className="pointer-events-none fixed left-4 top-4 z-50">
          <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black shadow-lg">
            {successToast}
          </div>
        </div>
      )}
    </form>
  );
};

const formatDelta = (delta: number): string => {
  if (Number.isNaN(delta)) return "+0.0";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
};
