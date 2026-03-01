import * as Evolu from "@evolu/common";
import { useCallback, useMemo } from "react";

import {
  AppSettingId,
  appSettingsQuery,
  useEvolu,
  useQuery,
} from "../evolu/client";

const DOUBLES_SETTING_KEY = "match-mode-doubles";

export function useDoublesPreference(): [
  boolean,
  (enabled: boolean) => void,
] {
  const { insert, update } = useEvolu();
  const rows = useQuery(appSettingsQuery);

  const preference = useMemo(
    () => rows.find((row) => row.key === DOUBLES_SETTING_KEY),
    [rows],
  );

  const isEnabled = preference?.isEnabled === Evolu.sqliteTrue;

  const setEnabled = useCallback(
    (enabled: boolean) => {
      const newValue = enabled ? Evolu.sqliteTrue : Evolu.sqliteFalse;

      if (preference) {
        update("appSetting", {
          id: preference.id as AppSettingId,
          isEnabled: newValue,
        });
      } else {
        insert("appSetting", {
          key: DOUBLES_SETTING_KEY,
          isEnabled: newValue,
        });
      }
    },
    [insert, preference, update],
  );

  return [isEnabled, setEnabled];
}
