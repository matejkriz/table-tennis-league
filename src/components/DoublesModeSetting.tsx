import { useTranslation } from "react-i18next";

import { useDoublesPreference } from "../hooks/useDoublesPreference";

export const DoublesModeSetting = () => {
  const { t } = useTranslation();
  const [isDoublesEnabled, setDoublesEnabled] = useDoublesPreference();

  return (
    <div className="space-y-3">
      <p className="text-sm text-black/60">
        {t("Enable doubles mode for 2v2 team matches.")}
      </p>
      <button
        type="button"
        onClick={() => setDoublesEnabled(!isDoublesEnabled)}
        className={`w-full rounded-xl px-5 py-3 text-left transition-colors ${
          isDoublesEnabled
            ? "bg-[#F7931A] text-white"
            : "bg-white text-black hover:bg-black/5"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {isDoublesEnabled ? t("Doubles is enabled") : t("Doubles is disabled")}
          </span>
          <span className="text-sm opacity-90">
            {isDoublesEnabled ? "✓" : ""}
          </span>
        </div>
      </button>
    </div>
  );
};
