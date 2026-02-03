import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import csTranslations from "./locales/cs.json";

// Initialize i18next
i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "cs"],
    keySeparator: false, // Allow keys with dots (e.g., "e.g. Katarína")
    nsSeparator: false, // Allow keys with colons
    interpolation: {
      escapeValue: false, // React already escapes
    },
    resources: {
      cs: { translation: csTranslations },
      // No 'en' resource - fallback to key itself
    },
    detection: {
      // Order of language detection
      order: [
        "querystring",
        "cookie",
        "localStorage",
        "sessionStorage",
        "navigator",
        "htmlTag",
      ],
      // Cache user language in localStorage
      caches: ["localStorage"],
      lookupQuerystring: "lng",
      lookupCookie: "i18next",
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18next;
