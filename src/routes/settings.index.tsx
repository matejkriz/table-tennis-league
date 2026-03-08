import { Link, createFileRoute } from "@tanstack/react-router";
import { IconChevronRight, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { DoublesModeSetting } from "../components/DoublesModeSetting";
import { LanguageSelector } from "../components/LanguageSelector";
import { OwnerSection } from "../components/OwnerSection";
import { PushNotificationsSection } from "../components/PushNotificationsSection";
import { useLeagueData } from "../hooks/useLeagueData";

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { players, matches } = useLeagueData();

  const matchCount = matches.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          {t("Table Tennis League")}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-black/50">
          <span>{players.length} {t("players")}</span>
          <span className="text-black/20">•</span>
          <span>{matchCount} {t("matches")}</span>
        </div>
      </header>

      <div className="space-y-6">
        <Link
          aria-label={t("Edit players")}
          className="flex items-center justify-between rounded-lg border border-black/10 bg-white p-4 transition-colors hover:border-[#F7931A]/40 hover:bg-[#F7931A]/5"
          to="/settings/players"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black/70">
              <IconUsers className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-black">{t("Edit players")}</p>
              <p className="text-sm text-black/50">
                {t("Rename, delete, or restore players.")}
              </p>
            </div>
          </div>
          <IconChevronRight className="h-5 w-5 text-black/30" />
        </Link>

        <CollapsibleSection
          storageKey="section-settings-language"
          title={t("Language")}
          defaultOpen={false}
        >
          <LanguageSelector />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-settings-doubles"
          title={t("Doubles")}
          defaultOpen={false}
        >
          <DoublesModeSetting />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-settings-account"
          title={t("Account & sync")}
          defaultOpen={true}
        >
          <OwnerSection />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-settings-push"
          title={t("Push notifications")}
          defaultOpen={false}
        >
          <PushNotificationsSection />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
});
