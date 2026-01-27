import { createFileRoute } from "@tanstack/react-router";

import { AddPlayerForm } from "../components/AddPlayerForm";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { OwnerSection } from "../components/OwnerSection";
import { useLeagueData } from "../hooks/useLeagueData";

const SettingsPage = () => {
  const { players, matches } = useLeagueData();

  const matchCount = matches.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          Table Tennis League
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-black/50">
          <span>{players.length} players</span>
          <span className="text-black/20">•</span>
          <span>{matchCount} matches</span>
        </div>
      </header>

      <div className="space-y-6">
        <CollapsibleSection
          storageKey="section-settings-account"
          title="Account & sync"
          defaultOpen={true}
        >
          <OwnerSection />
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="section-settings-add-player"
          title="Add player"
          defaultOpen={false}
        >
          <AddPlayerForm />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
