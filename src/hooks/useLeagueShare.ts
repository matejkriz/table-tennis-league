import * as Evolu from "@evolu/common";
import { use, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  formatTypeError,
  leagueSettingsQuery,
  useEvolu,
  useQuery,
} from "../evolu/client";
import {
  buildShareUrl,
  decodeMnemonicShareToken,
  encodeMnemonicShareToken,
  normalizeLeagueName,
} from "../utils/mnemonicShare";
import { useDebouncedValue } from "./useDebouncedValue";

export const SHARE_LEAGUE_NAME_KEY = "share-league-name";
const SHARE_URL_DEBOUNCE_MS = 350;

export const getShareTokenFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("share");
};

export const clearShareTokenFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  params.delete("share");
  const nextUrl =
    params.toString().length > 0
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
};

interface UseLeagueShareOptions {
  /**
   * When true, QR generation is suppressed until import succeeds.
   * Use when a ?share= param was present at load time so the import
   * panel takes priority over the QR display.
   */
  suppressUntilImported?: boolean;
  /** Called after successful mnemonic restore, e.g. to clean the URL. */
  onImportSuccess?: () => void;
}

export const useLeagueShare = ({
  suppressUntilImported = false,
  onImportSuccess,
}: UseLeagueShareOptions = {}) => {
  const { t } = useTranslation();
  const evolu = useEvolu();
  const appOwner = use(evolu.appOwner);
  const leagueSettings = useQuery(leagueSettingsQuery);

  const leagueNameSetting = useMemo(
    () => leagueSettings.find((row) => row.key === SHARE_LEAGUE_NAME_KEY),
    [leagueSettings]
  );

  const [leagueName, setLeagueName] = useState(leagueNameSetting?.value ?? "");
  const [activeShareToken, setActiveShareToken] = useState(() =>
    getShareTokenFromUrl()
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isLoadingSharedLeague, setIsLoadingSharedLeague] = useState(false);

  useEffect(() => {
    setLeagueName(leagueNameSetting?.value ?? "");
  }, [leagueNameSetting?.value]);

  const normalizedLeagueName = normalizeLeagueName(leagueName);
  const debouncedLeagueName = useDebouncedValue(
    normalizedLeagueName,
    SHARE_URL_DEBOUNCE_MS
  );

  // When suppressUntilImported is true, suppress QR generation until the
  // share token has been consumed (activeShareToken becomes null).
  const showShareControls =
    !suppressUntilImported || activeShareToken === null;

  useEffect(() => {
    let active = true;

    if (!showShareControls || !appOwner?.mnemonic || normalizedLeagueName.length === 0) {
      setShareUrl(null);
      return () => {
        active = false;
      };
    }

    // Avoid expensive crypto work until the user pauses typing.
    // Clear stale URL immediately so the old QR/link isn't visible mid-edit.
    if (debouncedLeagueName !== normalizedLeagueName) {
      setShareUrl(null);
      return () => {
        active = false;
      };
    }

    void encodeMnemonicShareToken({
      mnemonic: appOwner.mnemonic,
      leagueName: debouncedLeagueName,
    })
      .then((result) => {
        if (!active) return;

        if (!result.ok) {
          setShareUrl(null);
          return;
        }

        setShareUrl(buildShareUrl(result.value));
      })
      .catch(() => {
        if (!active) return;
        setShareUrl(null);
      });

    return () => {
      active = false;
    };
  }, [
    appOwner?.mnemonic,
    debouncedLeagueName,
    normalizedLeagueName,
    showShareControls,
  ]);

  const persistLeagueName = (rawValue: string) => {
    const normalizedValue = normalizeLeagueName(rawValue);
    const valueToStore = normalizedValue.length > 0 ? normalizedValue : null;

    if (leagueNameSetting) {
      const result = evolu.update("leagueSetting", {
        id: leagueNameSetting.id,
        value: valueToStore,
      });
      if (!result.ok) {
        setShareError(formatTypeError(result.error));
      }
      return;
    }

    const result = evolu.insert("leagueSetting", {
      key: SHARE_LEAGUE_NAME_KEY,
      value: valueToStore,
    });
    if (!result.ok) {
      setShareError(formatTypeError(result.error));
    }
  };

  const handleLeagueNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLeagueName(event.target.value);
  };

  const handleLeagueNameBlur = () => {
    persistLeagueName(leagueName);
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareError(null);
    } catch {
      // Clipboard API unavailable or permission denied — fall back to
      // execCommand so the user still gets the URL on the clipboard.
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.cssText = "position:fixed;top:-9999px;left:-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (success) {
          setShareError(null);
        } else {
          setShareError(t("Failed to copy link. Please copy it manually."));
        }
      } catch {
        setShareError(t("Failed to copy link. Please copy it manually."));
      }
    }
  };

  const handleLoadSharedLeague = async () => {
    if (!activeShareToken || isLoadingSharedLeague) return;

    setIsLoadingSharedLeague(true);
    setShareError(null);
    try {
      const decodeResult = await decodeMnemonicShareToken({
        token: activeShareToken,
        leagueName,
      });

      if (!decodeResult.ok) {
        setShareError(t("Could not decrypt shared league. Check league name."));
        return;
      }

      const mnemonicResult = Evolu.Mnemonic.from(decodeResult.value);
      if (!mnemonicResult.ok) {
        setShareError(
          t("Shared league token does not contain a valid mnemonic.")
        );
        return;
      }

      await evolu.restoreAppOwner(mnemonicResult.value);
      setActiveShareToken(null);
      onImportSuccess?.();
    } catch {
      setShareError(t("Failed to restore shared league."));
    } finally {
      setIsLoadingSharedLeague(false);
    }
  };

  return {
    appOwner,
    leagueName,
    normalizedLeagueName,
    shareUrl,
    shareError,
    activeShareToken,
    isLoadingSharedLeague,
    handleLeagueNameChange,
    handleLeagueNameBlur,
    handleCopyShareLink,
    handleLoadSharedLeague,
  };
};
