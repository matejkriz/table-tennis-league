import * as Evolu from "@evolu/common";
import { IconMoodSad, IconTrophy } from "@tabler/icons-react";
import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MatchRow, PlayerId, PlayerRow } from "../evolu/client";
import { formatTypeError, useEvolu } from "../evolu/client";
import { useDoublesPreference } from "../hooks/useDoublesPreference";
import { K_FACTOR, useLeagueData } from "../hooks/useLeagueData";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  calculateTeamMatchRatingDeltas,
  type WinnerTeam,
} from "../utils/matchRating";
import { CollapsibleSection } from "./CollapsibleSection";
import { RatingChart } from "./RatingChart";

const PLAYER_A_COLOR = "#F7931A";
const PLAYER_B_COLOR = "#3B82F6";

interface MatchRecorderProps {
  readonly players: ReadonlyArray<PlayerRow>;
  readonly currentRatings: ReadonlyMap<PlayerId, number>;
  readonly matches: ReadonlyArray<MatchRow>;
}

export const MatchRecorder = ({
  players,
  currentRatings,
  matches,
}: MatchRecorderProps) => {
  const { t } = useTranslation();
  const { insert } = useEvolu();
  const [isDoublesEnabled] = useDoublesPreference();
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
  const [winnerTeam, setWinnerTeam] = useState<WinnerTeam>("A");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

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

    const teamAPlayerIds = isDoublesEnabled
      ? playerA2Id
        ? [playerAId, playerA2Id]
        : []
      : [playerAId];
    const teamBPlayerIds = isDoublesEnabled
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
  }, [isDoublesEnabled, playerA2Id, playerAId, playerB2Id, playerBId]);

  const preview = useMemo(() => {
    if (!teamSelection) {
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

    const teamALabel = participants
      .filter((entry) => entry.team === "A")
      .map((entry) => entry.player.name)
      .join(" + ");
    const teamBLabel = participants
      .filter((entry) => entry.team === "B")
      .map((entry) => entry.player.name)
      .join(" + ");

    return {
      ...ratingResult,
      participants,
      teamALabel,
      teamBLabel,
      teamAPlayerIds: teamSelection.teamAPlayerIds,
      teamBPlayerIds: teamSelection.teamBPlayerIds,
    };
  }, [currentRatings, playersById, teamSelection, winnerTeam]);

  const resetForm = () => {
    setNote("");
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!playerAId || !playerBId) {
      setError(t("Choose two players."));
      return;
    }

    if (isDoublesEnabled && (!playerA2Id || !playerB2Id)) {
      setError(t("Choose four players for doubles."));
      return;
    }

    const selectedIds = [
      playerAId,
      playerBId,
      ...(isDoublesEnabled ? [playerA2Id, playerB2Id] : []),
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
        playerA2Id: isDoublesEnabled ? playerA2Id : null,
        playerB2Id: isDoublesEnabled ? playerB2Id : null,
        winnerId,
        winnerTeam: isDoublesEnabled ? winnerTeam : null,
        playedAt: playedAtResult.value,
        note: trimmedNote.length > 0 ? trimmedNote : null,
      },
      {
        onComplete: () => {
          resetForm();

          void enqueueMatchNotification({
            playedAt: playedAtResult.value,
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

  const minPlayersRequired = isDoublesEnabled ? 4 : 2;
  if (players.length < minPlayersRequired) {
    return (
      <p className="py-8 text-center text-sm text-black/50">
        {isDoublesEnabled
          ? t("Add at least four players to record a doubles match.")
          : t("Add at least two players to record a match.")}
      </p>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
            {isDoublesEnabled ? t("Team A - player 1") : t("Player A")}
          </span>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
            value={playerAId}
            onChange={(event) => setPlayerAId(event.target.value as PlayerId | "")}
          >
            <option value="">{t("Select player")}</option>
            {getPlayerOptions(playerAId, [playerBId, playerA2Id, playerB2Id]).map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
            {isDoublesEnabled ? t("Team B - player 1") : t("Player B")}
          </span>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
            value={playerBId}
            onChange={(event) => setPlayerBId(event.target.value as PlayerId | "")}
          >
            <option value="">{t("Select player")}</option>
            {getPlayerOptions(playerBId, [playerAId, playerA2Id, playerB2Id]).map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isDoublesEnabled && (
        <div className="border-t border-black/10 pt-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Second players")}
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
                {t("Team A - player 2")}
              </span>
              <select
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
                value={playerA2Id}
                onChange={(event) => setPlayerA2Id(event.target.value as PlayerId | "")}
              >
                <option value="">{t("Select player")}</option>
                {getPlayerOptions(playerA2Id, [playerAId, playerBId, playerB2Id]).map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
                {t("Team B - player 2")}
              </span>
              <select
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
                value={playerB2Id}
                onChange={(event) => setPlayerB2Id(event.target.value as PlayerId | "")}
              >
                <option value="">{t("Select player")}</option>
                {getPlayerOptions(playerB2Id, [playerAId, playerBId, playerA2Id]).map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {preview && (
        <div className="border-t border-black/10 pt-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Winner")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: "A" as const,
                label: preview.teamALabel,
                color: PLAYER_A_COLOR,
              },
              {
                id: "B" as const,
                label: preview.teamBLabel,
                color: PLAYER_B_COLOR,
              },
            ]
              .map((item) => {
                const color = item.color;
                const isSelected = winnerTeam === item.id;
                const isLoser = winnerTeam !== item.id;

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
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all ${
                      !isSelected
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
                      className={`text-lg transition-all ${
                        isSelected ? "font-bold" : "font-medium text-black/70"
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

      {!isDoublesEnabled && (playerAId || playerBId) && (
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
            winnerId={winnerTeam === "A" ? playerAId : playerBId}
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
    </form>
  );
};

const formatDelta = (delta: number): string => {
  if (Number.isNaN(delta)) return "+0.0";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
};
