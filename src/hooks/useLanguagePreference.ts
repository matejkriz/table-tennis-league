import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  UiPreferenceId,
  useEvolu,
  useQuery,
  uiPreferencesQuery,
} from "../evolu/client";

const LANGUAGE_PREFERENCE_KEY = "app-language";

export type SupportedLanguage = "en" | "cs";

export function useLanguagePreference(): [
  SupportedLanguage,
  (language: SupportedLanguage) => void,
] {
  const { i18n } = useTranslation();
  const { insert, update } = useEvolu();
  const rows = useQuery(uiPreferencesQuery);

  const preference = useMemo(
    () => rows.find((row) => row.key === LANGUAGE_PREFERENCE_KEY),
    [rows]
  );

  // Get current language from i18next
  const currentLanguage = (i18n.language === "cs" ? "cs" : "en") as SupportedLanguage;

  // Sync i18next with Evolu preference on mount and when preference changes
  useEffect(() => {
    const savedLanguage = preference?.value;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "cs")) {
      if (i18n.language !== savedLanguage) {
        void i18n.changeLanguage(savedLanguage);
      }
    }
  }, [preference?.value, i18n]);

  const setLanguage = useCallback(
    (language: SupportedLanguage) => {
      // Update i18next
      void i18n.changeLanguage(language);

      // Update or insert Evolu preference
      if (preference) {
        update("_uiPreference", {
          id: preference.id as UiPreferenceId,
          value: language,
        });
      } else {
        insert("_uiPreference", {
          key: LANGUAGE_PREFERENCE_KEY,
          isOpen: 0 as const,
          value: language,
        });
      }
    },
    [preference, i18n, insert, update]
  );

  return [currentLanguage, setLanguage];
}
