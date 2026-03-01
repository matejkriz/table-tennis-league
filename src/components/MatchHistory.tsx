import * as Evolu from "@evolu/common";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { formatTypeError, useEvolu } from "../evolu/client";
import type { MatchSummary } from "../hooks/useLeagueData";

interface MatchHistoryProps {
  readonly matches: ReadonlyArray<MatchSummary>;
  readonly readonly?: boolean;
  readonly scrollToMatchId?: string;
}

export const MatchHistory = ({
  matches,
  readonly = false,
  scrollToMatchId,
}: MatchHistoryProps) => {
  const { t } = useTranslation();
  const { update } = useEvolu();
  const hasScrolledRef = useRef<string | null>(null);

  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-black/50">
        {t("Every match you record appears here with the STR rating changes.")}
      </p>
    );
  }

  const reversed = [...matches].sort((a, b) =>
    b.match.playedAt.localeCompare(a.match.playedAt),
  );

  useEffect(() => {
    if (!scrollToMatchId) return;
    if (hasScrolledRef.current === scrollToMatchId) return;

    const target = document.querySelector<HTMLElement>(
      `[data-match-id="${scrollToMatchId}"]`,
    );
    if (!target) return;

    hasScrolledRef.current = scrollToMatchId;
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [reversed, scrollToMatchId]);

  const handleDelete = (matchId: string) => {
    const confirmed = window.confirm(
      t("Delete this match? This will also revert rating calculations based on it."),
    );
    if (!confirmed) return;

    const result = update("match", {
      id: matchId,
      isDeleted: Evolu.sqliteTrue,
    });

    if (!result.ok) {
      alert(formatTypeError(result.error));
    }
  };

  return (
    <ol className="divide-y divide-black/5">
      {reversed.map((entry) => {
        const { match } = entry;
        const winnerTeam = entry.winnerTeam === "A" ? entry.teamAPlayers : entry.teamBPlayers;
        const loserTeam = entry.winnerTeam === "A" ? entry.teamBPlayers : entry.teamAPlayers;
        const winnerLabel = winnerTeam.map((player) => player.name).join(" + ");
        const loserLabel = loserTeam.map((player) => player.name).join(" + ");
        const participantCards = entry.participants
          .slice()
          .sort((a, b) => {
            if (a.team !== b.team) return a.team === "A" ? -1 : 1;
            return a.player.name.localeCompare(b.player.name);
          });

        return (
          <li
            key={match.id}
            id={`match-history-${match.id}`}
            data-match-id={match.id}
            className="py-5 first:pt-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-black/50">
                  {new Date(match.playedAt).toLocaleString()}
                </p>
                <p className="mt-2 text-base font-medium text-black">
                  {winnerLabel || t("Winner")}
                  <span className="ml-2 text-sm font-normal text-black/60">
                    {t("defeated")} {loserLabel || t("Opponent")}
                  </span>
                </p>
              </div>
              {!readonly && (
                <button
                  className="flex-shrink-0 p-2 text-black/30 transition-colors hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/50"
                  onClick={() => handleDelete(match.id)}
                  title={t("Delete match")}
                  type="button"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {participantCards.map((participant) => (
                <div key={participant.player.id} className="rounded border border-black/10 bg-black/5 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-black/50">
                    {participant.player.name}
                  </dt>
                  <dd className="mt-1.5 font-mono text-sm text-black">
                    <span className={participant.delta > 0 ? "text-[#F7931A]" : ""}>
                      {formatDelta(participant.delta)}
                    </span>{" "}
                    → {participant.ratingAfter.toFixed(1)}
                  </dd>
                </div>
              ))}
            </dl>

            {match.note && (
              <p className="mt-4 rounded border border-black/10 bg-black/5 px-3 py-2 text-sm text-black/70">
                {match.note}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
};

const formatDelta = (delta?: number): string => {
  if (delta == null || Number.isNaN(delta) || delta === 0) return "±0.0";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
};
