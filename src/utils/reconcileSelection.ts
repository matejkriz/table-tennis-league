import type { PlayerId } from "../evolu/client";

type PlayerWithId = { readonly id: PlayerId };

export const reconcileSelectionIds = (
  players: ReadonlyArray<PlayerWithId>,
  selectionIds: ReadonlyArray<PlayerId | "">,
): Array<PlayerId | ""> => {
  const availableIds = new Set(players.map((player) => player.id));
  const candidateIds = [
    ...selectionIds.filter(
      (playerId): playerId is PlayerId =>
        playerId !== "" && availableIds.has(playerId),
    ),
    ...players.map((player) => player.id),
  ];
  const usedIds = new Set<PlayerId>();

  return selectionIds.map(() => {
    const nextId = candidateIds.find((playerId) => !usedIds.has(playerId)) ?? "";
    if (nextId) {
      usedIds.add(nextId);
    }
    return nextId;
  });
};

export const selectionIdsMatch = (
  currentIds: ReadonlyArray<PlayerId | "">,
  nextIds: ReadonlyArray<PlayerId | "">,
): boolean => currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index]);
