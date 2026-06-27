import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { DuelsHistory } from "../components/DuelsHistory";
import { MatchRecorder } from "../components/MatchRecorder";
import type { MatchRecorderSelection } from "../components/MatchRecorder";
import type { PlayerId } from "../evolu/client";
import { useCollapsibleState } from "../hooks/useCollapsibleState";
import { useDoublesPreference } from "../hooks/useDoublesPreference";
import { useLeagueData } from "../hooks/useLeagueData";
import {
  reconcileSelectionIds,
  selectionIdsMatch,
} from "../utils/reconcileSelection";
import { shouldRedirectRootToStart } from "../utils/startAccess";

const createInitialSinglesSelection = (): MatchRecorderSelection => ({
  mode: "singles",
  playerAId: "",
  playerBId: "",
});

const createInitialDoublesSelection = (): MatchRecorderSelection => ({
  mode: "doubles",
  playerAId: "",
  playerA2Id: "",
  playerBId: "",
  playerB2Id: "",
});

export const MatchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDoublesEnabled] = useDoublesPreference();
  const { players, ranking, matches } = useLeagueData();
  const [isSinglesOpen, , setSinglesOpen] = useCollapsibleState(
    "section-match-record-match",
    true,
  );
  const [isDoublesOpen, , setDoublesOpen] = useCollapsibleState(
    "section-match-record-doubles-match",
    false,
  );
  const shouldRedirectToStart = shouldRedirectRootToStart({
    matchCount: matches.length,
    playerCount: players.length,
  });

  const ratingMap = useMemo(() => {
    const map = new Map<PlayerId, number>();
    ranking.forEach((entry) => {
      map.set(entry.player.id, entry.rating);
    });
    return map;
  }, [ranking]);

  const [singlesSelection, setSinglesSelection] = useState<MatchRecorderSelection>(
    () => createInitialSinglesSelection(),
  );
  const [doublesSelection, setDoublesSelection] = useState<MatchRecorderSelection>(
    () => createInitialDoublesSelection(),
  );

  useEffect(() => {
    setSinglesSelection((currentSelection) => {
      if (currentSelection.mode !== "singles") {
        return createInitialSinglesSelection();
      }

      const nextSelectionIds = reconcileSelectionIds(players, [
        currentSelection.playerAId,
        currentSelection.playerBId,
      ]);
      if (
        selectionIdsMatch(nextSelectionIds, [
          currentSelection.playerAId,
          currentSelection.playerBId,
        ])
      ) {
        return currentSelection;
      }

      return {
        mode: "singles",
        playerAId: nextSelectionIds[0],
        playerBId: nextSelectionIds[1],
      };
    });

    setDoublesSelection((currentSelection) => {
      if (currentSelection.mode !== "doubles") {
        return createInitialDoublesSelection();
      }
      const nextSelectionIds = reconcileSelectionIds(players, [
        currentSelection.playerAId,
        currentSelection.playerA2Id,
        currentSelection.playerBId,
        currentSelection.playerB2Id,
      ]);
      if (
        selectionIdsMatch(nextSelectionIds, [
          currentSelection.playerAId,
          currentSelection.playerA2Id,
          currentSelection.playerBId,
          currentSelection.playerB2Id,
        ])
      ) {
        return currentSelection;
      }

      return {
        mode: "doubles",
        playerAId: nextSelectionIds[0],
        playerA2Id: nextSelectionIds[1],
        playerBId: nextSelectionIds[2],
        playerB2Id: nextSelectionIds[3],
      };
    });
  }, [players]);

  useEffect(() => {
    if (!isDoublesEnabled) return;

    if (isSinglesOpen && isDoublesOpen) {
      setDoublesOpen(false);
      return;
    }

    if (!isSinglesOpen && !isDoublesOpen) {
      setSinglesOpen(true);
    }
  }, [
    isDoublesEnabled,
    isDoublesOpen,
    isSinglesOpen,
    setDoublesOpen,
    setSinglesOpen,
  ]);

  const activeSelection =
    isDoublesEnabled && isDoublesOpen ? doublesSelection : singlesSelection;

  const handleSinglesSelectionChange = useCallback(
    (selection: MatchRecorderSelection) => {
      setSinglesSelection(selection);
    },
    [],
  );

  const handleDoublesSelectionChange = useCallback(
    (selection: MatchRecorderSelection) => {
      setDoublesSelection(selection);
    },
    [],
  );

  const handleSinglesToggle = () => {
    if (isDoublesEnabled) {
      if (isSinglesOpen) return;
      setSinglesOpen(true);
      setDoublesOpen(false);
      return;
    }

    setSinglesOpen(!isSinglesOpen);
  };

  const handleDoublesToggle = () => {
    if (isDoublesOpen) return;
    setDoublesOpen(true);
    setSinglesOpen(false);
  };

  useEffect(() => {
    if (shouldRedirectToStart) {
      void navigate({ to: "/start" });
    }
  }, [navigate, shouldRedirectToStart]);

  if (shouldRedirectToStart) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-40 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          {t("Record Match")}
        </h1>
      </header>

      <div className="space-y-6">
        {isDoublesEnabled ? (
          <CollapsibleSection
            storageKey="section-match-record-match"
            title={t("Record match")}
            defaultOpen={true}
            isOpen={isSinglesOpen}
            onToggle={handleSinglesToggle}
          >
            <MatchRecorder
              currentRatings={ratingMap}
              players={players}
              matches={matches.map((m) => m.match)}
              mode="singles"
              onSelectionChange={handleSinglesSelectionChange}
            />
          </CollapsibleSection>
        ) : (
          <CollapsibleSection
            storageKey="section-match-record-match"
            title={t("Record match")}
            defaultOpen={true}
          >
            <MatchRecorder
              currentRatings={ratingMap}
              players={players}
              matches={matches.map((m) => m.match)}
              mode="singles"
              onSelectionChange={handleSinglesSelectionChange}
            />
          </CollapsibleSection>
        )}

        {isDoublesEnabled && (
          <CollapsibleSection
            storageKey="section-match-record-doubles-match"
            title={t("Record doubles match")}
            defaultOpen={false}
            isOpen={isDoublesOpen}
            onToggle={handleDoublesToggle}
          >
            <MatchRecorder
              currentRatings={ratingMap}
              players={players}
              matches={matches.map((m) => m.match)}
              mode="doubles"
              onSelectionChange={handleDoublesSelectionChange}
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          storageKey="section-match-match-history"
          title={t("Duels history")}
          defaultOpen={false}
        >
          <DuelsHistory matches={matches} activeSelection={activeSelection} />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: MatchPage,
});
