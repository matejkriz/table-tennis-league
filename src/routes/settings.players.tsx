import { dateToDateIso, sqliteFalse, sqliteTrue } from "@evolu/common";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  IconArrowLeft,
  IconCheck,
  IconEdit,
  IconRestore,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AddPlayerForm } from "../components/AddPlayerForm";
import { allPlayersQuery, formatTypeError, useEvolu, useQuery } from "../evolu/client";
import type { AllPlayerRow } from "../evolu/client";

const RETENTION_WINDOW_DAYS = 30;
const RETENTION_WINDOW_MS = RETENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

interface PlayerManagementGroups {
  readonly activePlayers: ReadonlyArray<AllPlayerRow>;
  readonly deletedPlayers: ReadonlyArray<AllPlayerRow>;
}

interface EditablePlayerRowProps {
  readonly player: AllPlayerRow;
  readonly draftName: string;
  readonly error: string | null;
  readonly isEditing: boolean;
  readonly onDelete: (player: AllPlayerRow) => void;
  readonly onDraftNameChange: (name: string) => void;
  readonly onEditStart: (player: AllPlayerRow) => void;
  readonly onEditCancel: () => void;
  readonly onSave: (event: FormEvent<HTMLFormElement>, player: AllPlayerRow) => void;
}

interface DeletedPlayerRowProps {
  readonly player: AllPlayerRow;
  readonly onRestore: (player: AllPlayerRow) => void;
}

export const PlayerManagementPage = () => {
  const { t } = useTranslation();
  const { update } = useEvolu();
  const players = useQuery(allPlayersQuery);
  const now = useRetentionWindowNow(players);
  const [editingPlayerId, setEditingPlayerId] = useState<AllPlayerRow["id"] | null>(
    null,
  );
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { activePlayers, deletedPlayers } = splitPlayersByStatus(players, now);
  const activePlayersCountLabel = t("players_count", {
    count: activePlayers.length,
  });
  const activePlayersCountFallback =
    activePlayers.length === 1
      ? `${activePlayers.length} player`
      : `${activePlayers.length} players`;

  const handleEditStart = (player: AllPlayerRow) => {
    setEditingPlayerId(player.id);
    setDraftName(player.name);
    setError(null);
  };

  const handleEditCancel = () => {
    setEditingPlayerId(null);
    setDraftName("");
    setError(null);
  };

  const handleSave = (
    event: FormEvent<HTMLFormElement>,
    player: AllPlayerRow,
  ) => {
    event.preventDefault();
    setError(null);

    const result = update("player", {
      id: player.id,
      name: draftName.trim(),
    });

    if (!result.ok) {
      setError(formatTypeError(result.error));
      return;
    }

    handleEditCancel();
  };

  const handleDelete = (player: AllPlayerRow) => {
    setError(null);

    const deletedAtResult = dateToDateIso(new Date());
    if (!deletedAtResult.ok) {
      setError(formatTypeError(deletedAtResult.error));
      return;
    }

    const result = update("player", {
      id: player.id,
      isDeleted: sqliteTrue,
      deletedAt: deletedAtResult.value,
    });

    if (!result.ok) {
      setError(formatTypeError(result.error));
      return;
    }

    if (editingPlayerId === player.id) {
      handleEditCancel();
    }
  };

  const handleRestore = (player: AllPlayerRow) => {
    setError(null);

    const result = update("player", {
      id: player.id,
      isDeleted: sqliteFalse,
      deletedAt: null,
    });

    if (!result.ok) {
      setError(formatTypeError(result.error));
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-8">
        <Link
          className="inline-flex items-center gap-2 text-sm text-black/50 transition-colors hover:text-black"
          to="/settings"
        >
          <IconArrowLeft className="h-4 w-4" />
          <span>{t("Back to Settings")}</span>
        </Link>
        <h1 className="mt-4 text-3xl font-light text-black sm:text-4xl">
          {t("Edit players")}
        </h1>
        <p className="mt-3 text-sm text-black/60">
          {t("Rename players, remove them from active play, or restore them within 30 days.")}
        </p>
      </header>

      {error ? (
        <p className="mb-6 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-black/70">
          {error}
        </p>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-black">{t("Add player")}</h2>
            <p className="text-sm text-black/50">
              {t("Add player names. New players start with STR 1000.")}
            </p>
          </div>
          <AddPlayerForm />
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-black">{t("Active players")}</h2>
              <p className="text-sm text-black/50">
                {t("Active players appear in match recording and the ranking table.")}
              </p>
            </div>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-black/60">
              {activePlayersCountLabel === "players_count"
                ? activePlayersCountFallback
                : activePlayersCountLabel}
            </span>
          </div>

          {activePlayers.length === 0 ? (
            <p className="py-6 text-sm text-black/50">
              {t("No active players yet.")}
            </p>
          ) : (
            <ol className="space-y-3">
              {activePlayers.map((player) => (
                <EditablePlayerRow
                  key={player.id}
                  draftName={draftName}
                  error={editingPlayerId === player.id ? error : null}
                  isEditing={editingPlayerId === player.id}
                  player={player}
                  onDelete={handleDelete}
                  onDraftNameChange={setDraftName}
                  onEditCancel={handleEditCancel}
                  onEditStart={handleEditStart}
                  onSave={handleSave}
                />
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-black">{t("Recently deleted players")}</h2>
            <p className="text-sm text-black/50">
              {t("Deleted players stay here for 30 days and can still be restored.")}
            </p>
          </div>

          {deletedPlayers.length === 0 ? (
            <p className="py-6 text-sm text-black/50">
              {t("No recently deleted players.")}
            </p>
          ) : (
            <ol className="space-y-3">
              {deletedPlayers.map((player) => (
                <DeletedPlayerRow
                  key={player.id}
                  player={player}
                  onRestore={handleRestore}
                />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};

const EditablePlayerRow = ({
  player,
  draftName,
  error,
  isEditing,
  onDelete,
  onDraftNameChange,
  onEditStart,
  onEditCancel,
  onSave,
}: EditablePlayerRowProps) => {
  const { t } = useTranslation();

  return (
    <li className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form className="space-y-3" onSubmit={(event) => onSave(event, player)}>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
                  {t("Player name")}
                </span>
                <input
                  autoComplete="off"
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base text-black shadow-sm transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
                  maxLength={100}
                  onChange={(event) => onDraftNameChange(event.target.value)}
                  value={draftName}
                />
              </label>
              {error ? <p className="text-sm text-black/60">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  aria-label={`${t("Save")} ${player.name}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F7931A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#F7931A]/90"
                  type="submit"
                >
                  <IconCheck className="h-4 w-4" />
                  <span>{t("Save")}</span>
                </button>
                <button
                  aria-label={`${t("Cancel")} ${player.name}`}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5"
                  onClick={onEditCancel}
                  type="button"
                >
                  <IconX className="h-4 w-4" />
                  <span>{t("Cancel")}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-base font-medium text-black">{player.name}</p>
              <p className="mt-1 text-sm text-black/50">
                {t("Start")} {player.initialRating.toFixed(1)}
              </p>
            </>
          )}
        </div>

        {!isEditing ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              aria-label={`${t("Edit")} ${player.name}`}
              className="rounded-full border border-black/10 p-2 text-black/60 transition-colors hover:border-[#F7931A]/40 hover:text-[#F7931A]"
              onClick={() => onEditStart(player)}
              type="button"
            >
              <IconEdit className="h-4 w-4" />
            </button>
            <button
              aria-label={`${t("Delete")} ${player.name}`}
              className="rounded-full border border-black/10 p-2 text-black/60 transition-colors hover:border-[#F7931A]/40 hover:text-[#F7931A]"
              onClick={() => onDelete(player)}
              type="button"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
};

const DeletedPlayerRow = ({ player, onRestore }: DeletedPlayerRowProps) => {
  const { t, i18n } = useTranslation();

  return (
    <li className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-black">{player.name}</p>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-black/60">
              {t("Deleted")}
            </span>
          </div>
          <p className="mt-1 text-sm text-black/50">
            {t("Deleted on {{date}}", {
              date: player.deletedAt
                ? new Date(player.deletedAt).toLocaleDateString(i18n.language)
                : t("Unknown date"),
            })}
          </p>
        </div>

        <button
          aria-label={`${t("Restore")} ${player.name}`}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5"
          onClick={() => onRestore(player)}
          type="button"
        >
          <IconRestore className="h-4 w-4" />
          <span>{t("Restore")}</span>
        </button>
      </div>
    </li>
  );
};

const splitPlayersByStatus = (
  players: ReadonlyArray<AllPlayerRow>,
  now: Date,
): PlayerManagementGroups => {
  const nowTimestamp = now.getTime();

  const activePlayers = players.filter((player) => player.deletedAt == null);
  const deletedPlayers = players
    .filter((player) => {
      if (player.deletedAt == null) {
        return false;
      }

      const deletedAtTimestamp = new Date(player.deletedAt).getTime();
      return (
        Number.isFinite(deletedAtTimestamp) &&
        nowTimestamp - deletedAtTimestamp < RETENTION_WINDOW_MS
      );
    })
    .sort((left, right) => right.deletedAt!.localeCompare(left.deletedAt!));

  return {
    activePlayers,
    deletedPlayers,
  };
};

const useRetentionWindowNow = (players: ReadonlyArray<AllPlayerRow>): Date => {
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const nextExpirationTimestamp = players.reduce<number | null>((nextExpiration, player) => {
      if (player.deletedAt == null) {
        return nextExpiration;
      }

      const deletedAtTimestamp = new Date(player.deletedAt).getTime();
      if (!Number.isFinite(deletedAtTimestamp)) {
        return nextExpiration;
      }

      const expirationTimestamp = deletedAtTimestamp + RETENTION_WINDOW_MS;
      if (expirationTimestamp <= nowTimestamp) {
        return nextExpiration;
      }

      if (nextExpiration == null || expirationTimestamp < nextExpiration) {
        return expirationTimestamp;
      }

      return nextExpiration;
    }, null);

    if (nextExpirationTimestamp == null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNowTimestamp(Date.now());
    }, Math.min(nextExpirationTimestamp - nowTimestamp, MAX_TIMEOUT_MS));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [players, nowTimestamp]);

  return new Date(nowTimestamp);
};

export const Route = createFileRoute("/settings/players")({
  component: PlayerManagementPage,
});
