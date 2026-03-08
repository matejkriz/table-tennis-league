import * as Evolu from "@evolu/common";
import { use, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEvolu } from "../evolu/client";
import {
  buildShareUrl,
  decodeMnemonicShareToken,
  encodeMnemonicShareToken,
  extractShareTokenFromShareUrl,
} from "../utils/mnemonicShare";

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
  readonly onImportSuccess?: () => void;
}

export const useLeagueShare = ({
  onImportSuccess,
}: UseLeagueShareOptions = {}) => {
  const { t } = useTranslation();
  const evolu = useEvolu();
  const appOwner = use(evolu.appOwner);

  const [activeShareToken, setActiveShareToken] = useState(() =>
    getShareTokenFromUrl()
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isImportingShare, setIsImportingShare] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastAutoImportToken, setLastAutoImportToken] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    if (!appOwner?.mnemonic || activeShareToken !== null) {
      setShareUrl(null);
      return () => {
        active = false;
      };
    }

    void encodeMnemonicShareToken({
      mnemonic: appOwner.mnemonic,
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
  }, [activeShareToken, appOwner?.mnemonic]);

  const importShareToken = useCallback(
    async (token: string): Promise<boolean> => {
    if (isImportingShare) return false;

    setIsImportingShare(true);
    setShareError(null);
    try {
      const decodeResult = await decodeMnemonicShareToken({
        token,
      });

      if (!decodeResult.ok) {
        setShareError(t("Could not decrypt shared league."));
        return false;
      }

      const mnemonicResult = Evolu.Mnemonic.from(decodeResult.value);
      if (!mnemonicResult.ok) {
        setShareError(
          t("Shared league token does not contain a valid mnemonic.")
        );
        return false;
      }

      await evolu.restoreAppOwner(mnemonicResult.value);
      setActiveShareToken(null);
      setIsScannerOpen(false);
      setLastAutoImportToken(null);
      onImportSuccess?.();
      return true;
    } catch {
      setShareError(t("Failed to restore shared league."));
      return false;
    } finally {
      setIsImportingShare(false);
    }
    },
    [evolu, isImportingShare, onImportSuccess, t]
  );

  useEffect(() => {
    if (activeShareToken == null || activeShareToken === lastAutoImportToken) {
      return;
    }

    setLastAutoImportToken(activeShareToken);
    void importShareToken(activeShareToken);
  }, [activeShareToken, importShareToken, lastAutoImportToken]);

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareError(null);
    } catch {
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

  const handleScannedValue = async (value: string): Promise<boolean> => {
    const shareTokenResult = extractShareTokenFromShareUrl(value);

    if (!shareTokenResult.ok) {
      setShareError(t("Scanned QR code does not contain a valid share link."));
      return false;
    }

    return importShareToken(shareTokenResult.value);
  };

  return {
    appOwner,
    activeShareToken,
    shareUrl,
    shareError,
    isImportingShare,
    isScannerOpen,
    openScanner: () => setIsScannerOpen(true),
    closeScanner: () => setIsScannerOpen(false),
    handleCopyShareLink,
    handleScannedValue,
    handleScannerError: (message: string) => setShareError(message),
  };
};
