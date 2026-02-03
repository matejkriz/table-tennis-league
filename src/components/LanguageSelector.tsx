import { useTranslation } from "react-i18next";

import { useLanguagePreference, type SupportedLanguage } from "../hooks/useLanguagePreference";

export const LanguageSelector = () => {
  const { t } = useTranslation();
  const [currentLanguage, setLanguage] = useLanguagePreference();

  const languages: Array<{ code: SupportedLanguage; label: string }> = [
    { code: "en", label: t("English") },
    { code: "cs", label: t("Czech") },
  ];

  return (
    <div className="space-y-2">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`w-full rounded-xl px-5 py-3 text-left transition-colors ${
            currentLanguage === code
              ? "bg-[#F7931A] text-white"
              : "bg-white text-black hover:bg-black/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{label}</span>
            {currentLanguage === code && (
              <span className="text-sm opacity-90">✓</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
