import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconQrcode } from "@tabler/icons-react";

import { formatTypeError, useEvolu } from "../evolu/client";
import { useLeagueData } from "../hooks/useLeagueData";
import {
  getShareTokenFromUrl,
  useLeagueShare,
} from "../hooks/useLeagueShare";
import { canAccessStartRoute } from "../utils/startAccess";
import { LeagueShareQR } from "../components/LeagueShareQR";
import { LeagueShareScanner } from "../components/LeagueShareScanner";

const DEFAULT_START_RATING = 1000;

export const StartPage = () => {
  const { t } = useTranslation();
  const evolu = useEvolu();
  const navigate = useNavigate();
  const { players, matches } = useLeagueData();

  const [shareToken] = useState(() => getShareTokenFromUrl());
  const hasShareParam = shareToken != null;

  const canUseStartRoute = canAccessStartRoute({
    hasShareParam,
    matchCount: matches.length,
    playerCount: players.length,
  });

  useEffect(() => {
    if (!hasShareParam && !canUseStartRoute) {
      void navigate({ to: "/" });
    }
  }, [canUseStartRoute, hasShareParam, navigate]);

  const {
    shareUrl,
    shareError,
    activeShareToken,
    isImportingShare,
    isScannerOpen,
    openScanner,
    closeScanner,
    handleCopyShareLink,
    handleScannedValue,
    handleScannerError,
  } = useLeagueShare();

  const [playerName, setPlayerName] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);

  const handleAddPlayer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlayerError(null);

    const trimmedName = playerName.trim();
    if (trimmedName.length === 0) {
      setPlayerError(t("Player name is required."));
      return;
    }

    const shouldRedirectAfterAdd =
      (hasShareParam && activeShareToken === null) ||
      (!hasShareParam && players.length >= 1);

    const insertResult = evolu.insert(
      "player",
      {
        name: trimmedName,
        initialRating: DEFAULT_START_RATING,
      },
      {
        onComplete: () => {
          setPlayerName("");
          if (shouldRedirectAfterAdd) {
            void navigate({ to: "/" });
          }
        },
      }
    );

    if (!insertResult.ok) {
      setPlayerError(formatTypeError(insertResult.error));
    }
  };

  const showShareImportStep = hasShareParam && activeShareToken !== null;
  const showAddYourselfStep = hasShareParam && activeShareToken === null;
  const addPlayerButtonText = showAddYourselfStep
    ? t("Add yourself and continue")
    : t("Add player");
  const addPlayerTitle = showAddYourselfStep
    ? t("Add yourself to this league")
    : t("Add players");
  const showShareSection = !hasShareParam || showShareImportStep;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-40 sm:px-6 sm:py-8 md:pb-8 md:pt-20">
      <header className="mb-10">
        <h1 className="text-3xl font-light text-black sm:text-4xl">
          {t("Welcome to Table Tennis League")}
        </h1>
        <p className="mt-3 text-sm text-black/60">
          {t("Set up your league and start recording matches in seconds.")}
        </p>
      </header>

      <div className="space-y-6">
        {showShareSection && (
          <div className="rounded border border-black/10 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-black/50">
              {showShareImportStep
                ? t("Shared league link detected")
                : t("Share this league by QR")}
            </p>
            <p className="mt-2 text-sm text-black/60">
              {showShareImportStep
                ? t("Loading shared league...")
                : t("Scan this QR code or copy the share link to restore this league on another device.")}
            </p>

            <LeagueShareQR
              onCopyShareLink={handleCopyShareLink}
              shareUrl={shareUrl}
            />

            {!showShareImportStep && (
              <div className="mt-4 flex justify-end">
                <button
                  className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2 text-xs font-semibold text-black shadow-sm transition-all hover:border-black/20 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/30"
                  onClick={openScanner}
                  type="button"
                >
                  <IconQrcode className="h-4 w-4" />
                  {t("Scan QR code")}
                </button>
              </div>
            )}

            <LeagueShareScanner
              isOpen={isScannerOpen}
              onClose={closeScanner}
              onScanError={handleScannerError}
              onScanResult={handleScannedValue}
            />

            {isImportingShare && showShareImportStep && (
              <p className="mt-4 text-sm text-black/60">
                {t("Loading shared league...")}
              </p>
            )}

            {shareError && (
              <p className="mt-3 text-sm text-red-600">{shareError}</p>
            )}
          </div>
        )}

        {!showShareImportStep && (
          <div className="rounded border border-black/10 bg-black/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-black/60">
              {addPlayerTitle}
            </p>
            <p className="mt-2 text-sm text-black/60">
              {showAddYourselfStep
                ? t("Add yourself with default STR 1000 to continue.")
                : t("Add player names. New players start with STR 1000.")}
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleAddPlayer}>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
                  {t("Your name")}
                </span>
                <input
                  autoComplete="off"
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base text-black shadow-sm placeholder:text-black/40 transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
                  maxLength={100}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder={t("e.g. Jan Netrefil")}
                  required
                  value={playerName}
                />
              </label>
              {playerError && (
                <p className="text-sm text-black/60">{playerError}</p>
              )}
              <div className="flex justify-end">
                <button
                  className="rounded-full bg-[#F7931A] px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#F7931A]/90 hover:shadow-lg active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/50"
                  type="submit"
                >
                  {addPlayerButtonText}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/start")({
  component: StartPage,
});
