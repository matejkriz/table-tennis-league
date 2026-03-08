import * as Evolu from "@evolu/common";
import { useCallback, useMemo } from "react";

import {
  formatTypeError,
  uiPreferencesQuery,
  useEvolu,
  useQuery,
  type UiPreferenceId,
} from "../evolu/client";

/**
 * Hook to manage collapsible section state with Evolu persistence.
 * Uses Evolu's _uiPreference table (underscore prefix = local-only, not synced).
 *
 * @param key - Unique identifier for the section (e.g., "section-home-ranking")
 * @param defaultOpen - Whether the section should be open by default
 * @returns [isOpen, toggle, setOpen] - Current state, toggle function, and explicit setter
 */
export function useCollapsibleState(
  key: string,
  defaultOpen: boolean
): [boolean, () => void, (open: boolean) => void] {
  const { insert, update } = useEvolu();
  const rows = useQuery(uiPreferencesQuery);

  // Find the preference for this key
  const preference = useMemo(
    () => rows.find((row) => row.key === key),
    [rows, key]
  );

  // Determine current state: use stored value if exists, otherwise default
  const isOpen = preference
    ? preference.isOpen === Evolu.sqliteTrue
    : defaultOpen;

  const setOpen = useCallback(
    (open: boolean) => {
      const newValue = open ? Evolu.sqliteTrue : Evolu.sqliteFalse;

      if (preference) {
        const result = update("_uiPreference", {
          id: preference.id as UiPreferenceId,
          isOpen: newValue,
        });
        if (!result.ok) {
          console.error(
            "Failed to update UI preference:",
            formatTypeError(result.error),
          );
        }
        return;
      }

      const result = insert("_uiPreference", {
        key,
        isOpen: newValue,
      });
      if (!result.ok) {
        console.error(
          "Failed to insert UI preference:",
          formatTypeError(result.error),
        );
      }
    },
    [insert, key, preference, update],
  );

  const toggle = useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);

  return [isOpen, toggle, setOpen];
}
