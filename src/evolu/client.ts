import * as Evolu from "@evolu/common";
import { createUseEvolu, EvoluProvider, useQuery } from "@evolu/react";
import { evoluReactWebDeps, localAuth } from "@evolu/react-web";

import { encryptedMnemonic } from "../mnemonics";
import { decrypt } from "../utils/encryption";

const service = "str-pwa-react-20251201";

export const PlayerId = Evolu.id("Player");
export type PlayerId = typeof PlayerId.Type;

export const MatchId = Evolu.id("Match");
export type MatchId = typeof MatchId.Type;

export const UiPreferenceId = Evolu.id("UiPreference");
export type UiPreferenceId = typeof UiPreferenceId.Type;

export const LeagueSettingId = Evolu.id("LeagueSetting");
export type LeagueSettingId = typeof LeagueSettingId.Type;
export const AppSettingId = Evolu.id("AppSetting");
export type AppSettingId = typeof AppSettingId.Type;

const Schema = {
  player: {
    id: PlayerId,
    name: Evolu.NonEmptyTrimmedString100,
    initialRating: Evolu.NonNegativeNumber,
    deletedAt: Evolu.nullOr(Evolu.DateIso),
  },
  match: {
    id: MatchId,
    playerAId: PlayerId,
    playerBId: PlayerId,
    playerA2Id: Evolu.nullOr(PlayerId),
    playerB2Id: Evolu.nullOr(PlayerId),
    winnerId: PlayerId,
    winnerTeam: Evolu.nullOr(Evolu.NonEmptyTrimmedString100),
    playedAt: Evolu.DateIso,
    note: Evolu.nullOr(Evolu.NonEmptyTrimmedString1000),
  },
  leagueSetting: {
    id: LeagueSettingId,
    key: Evolu.NonEmptyTrimmedString100,
    value: Evolu.nullOr(Evolu.NonEmptyTrimmedString100),
  },
  appSetting: {
    id: AppSettingId,
    key: Evolu.NonEmptyTrimmedString100,
    isEnabled: Evolu.SqliteBoolean,
  },
  // Underscore prefix = local-only, not synced across devices
  _uiPreference: {
    id: UiPreferenceId,
    key: Evolu.NonEmptyTrimmedString100,
    isOpen: Evolu.SqliteBoolean,
    value: Evolu.nullOr(Evolu.NonEmptyTrimmedString100),
  },
};

type Schema = typeof Schema;

export const ownerProfiles = await localAuth.getProfiles({ service });
export const authResult = await localAuth.getOwner({ service });

export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
  name: Evolu.SimpleName.orThrow(
    `${service}-${authResult?.owner?.id ?? "guest"}`
  ),
  encryptionKey: authResult?.owner?.encryptionKey,
  externalAppOwner: authResult?.owner,
  transports: [
    { type: "WebSocket", url: "wss://evolu.linky.fit" },
    { type: "WebSocket", url: "wss://free.evoluhq.com" },
  ]
});

// Check for encryption key in URL and restore mnemonic if provided
const restoreFromUrlKey = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const encryptionKey = urlParams.get("key");

  if (!encryptionKey) {
    return; // No key provided, nothing to do
  }

  const decryptResult = await decrypt({
    value: encryptedMnemonic,
    encryptionKey,
  });

  if (!decryptResult.ok) {
    // Wrong key or decryption failed, silently ignore
    return;
  }

  const mnemonicResult = Evolu.Mnemonic.from(decryptResult.value);

  if (!mnemonicResult.ok) {
    // Decrypted value is not a valid mnemonic, silently ignore
    return;
  }

  // Successfully decrypted and validated mnemonic, restore owner
  void evolu.restoreAppOwner(mnemonicResult.value);

  // Clean up the URL by removing the key parameter
  urlParams.delete("key");
  const newUrl =
    urlParams.toString().length > 0
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
};

// Execute restoration check (fire and forget)
void restoreFromUrlKey();

export const useEvolu = createUseEvolu(evolu);

export const formatTypeError = Evolu.createFormatTypeError<
  | Evolu.MinLengthError
  | Evolu.MaxLengthError
  | Evolu.TrimmedError
  | Evolu.NumberError
  | Evolu.NonNegativeError
  | Evolu.DateIsoError
>((error): string => {
  switch (error.type) {
    case "MinLength":
      return `Value must be at least ${error.min} characters.`;
    case "MaxLength":
      return `Value cannot exceed ${error.max} characters.`;
    case "Trimmed":
      return "Remove leading or trailing spaces.";
    case "Number":
      return "Provide a valid number.";
    case "NonNegative":
      return "Value must be zero or positive.";
    case "DateIso":
      return "Invalid date.";
  }
});

evolu.subscribeError(() => {
  const error = evolu.getError();
  if (!error) return;
  alert(`Evolu error occurred. ${error}`);

  console.error(error);
});

export const playersQuery = evolu.createQuery((db) =>
  db
    .selectFrom("player")
    .select(["id", "name", "initialRating", "createdAt", "deletedAt"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("name", "is not", null)
    .$narrowType<{ name: Evolu.kysely.NotNull }>()
    .where("initialRating", "is not", null)
    .$narrowType<{ initialRating: Evolu.kysely.NotNull }>()
    .orderBy("createdAt")
);

export type PlayerRow = typeof playersQuery.Row;

export const allPlayersQuery = evolu.createQuery((db) =>
  db
    .selectFrom("player")
    .select(["id", "name", "initialRating", "createdAt", "deletedAt"])
    .where("name", "is not", null)
    .$narrowType<{ name: Evolu.kysely.NotNull }>()
    .where("initialRating", "is not", null)
    .$narrowType<{ initialRating: Evolu.kysely.NotNull }>()
    .orderBy("createdAt")
);

export type AllPlayerRow = typeof allPlayersQuery.Row;

export const matchesQuery = evolu.createQuery((db) =>
  db
    .selectFrom("match")
    .select([
      "id",
      "playerAId",
      "playerBId",
      "playerA2Id",
      "playerB2Id",
      "winnerId",
      "winnerTeam",
      "playedAt",
      "note",
      "createdAt",
    ])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("playerAId", "is not", null)
    .$narrowType<{ playerAId: Evolu.kysely.NotNull }>()
    .where("playerBId", "is not", null)
    .$narrowType<{ playerBId: Evolu.kysely.NotNull }>()
    .where("winnerId", "is not", null)
    .$narrowType<{ winnerId: Evolu.kysely.NotNull }>()
    .where("playedAt", "is not", null)
    .$narrowType<{ playedAt: Evolu.kysely.NotNull }>()
    .orderBy("playedAt")
    .orderBy("createdAt")
);

export type MatchRow = typeof matchesQuery.Row;

export const leagueSettingsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("leagueSetting")
    .select(["id", "key", "value"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("key", "is not", null)
    .$narrowType<{ key: Evolu.kysely.NotNull }>()
);

export type LeagueSettingRow = typeof leagueSettingsQuery.Row;
export const appSettingsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("appSetting")
    .select(["id", "key", "isEnabled", "createdAt"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("key", "is not", null)
    .$narrowType<{ key: Evolu.kysely.NotNull }>()
    .where("isEnabled", "is not", null)
    .$narrowType<{ isEnabled: Evolu.kysely.NotNull }>()
    .orderBy("createdAt", "desc")
);

export type AppSettingRow = typeof appSettingsQuery.Row;

export const uiPreferencesQuery = evolu.createQuery((db) =>
  db
    .selectFrom("_uiPreference")
    .select(["id", "key", "isOpen", "value"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("key", "is not", null)
    .$narrowType<{ key: Evolu.kysely.NotNull }>()
    .where("isOpen", "is not", null)
    .$narrowType<{ isOpen: Evolu.kysely.NotNull }>()
);

export type UiPreferenceRow = typeof uiPreferencesQuery.Row;

export { EvoluProvider, useQuery };
