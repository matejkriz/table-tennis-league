import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslation } from "react-i18next";

interface LeagueShareScannerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onScanResult: (value: string) => Promise<boolean>;
  readonly onScanError: (message: string) => void;
}

const useIsDesktopScannerMode = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window.matchMedia === "function"
      ? !window.matchMedia("(pointer: coarse)").matches
      : true
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const handleChange = () => {
      setIsDesktop(!mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isDesktop;
};

export const LeagueShareScanner = ({
  isOpen,
  onClose,
  onScanResult,
  onScanError,
}: LeagueShareScannerProps) => {
  const { t } = useTranslation();
  const scannerId = useId().replace(/:/g, "-");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandlingDecodeRef = useRef(false);
  const isDesktop = useIsDesktopScannerMode();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const clearScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Stop errors are non-fatal during teardown.
    }

    try {
      scanner.clear();
    } catch {
      // Clear can throw if scanner was not fully mounted.
    }

    scannerRef.current = null;
  };

  const handleDecodedText = useCallback(async (decodedText: string) => {
    if (isHandlingDecodeRef.current) {
      return;
    }

    isHandlingDecodeRef.current = true;
    const didImport = await onScanResult(decodedText);
    isHandlingDecodeRef.current = false;

    if (didImport) {
      onClose();
    }
  }, [onClose, onScanResult]);

  const reportCameraStartError = useCallback(() => {
    onScanError(t("Could not start camera scanner."));
  }, [onScanError, t]);

  useEffect(() => {
    if (!isOpen || isDesktop) {
      void clearScanner();
      return;
    }

    const scanner = new Html5Qrcode(scannerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    scannerRef.current = scanner;
    let cancelled = false;

    void scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText) => {
          void handleDecodedText(decodedText);
        },
        () => {}
      )
      .catch(() => {
        if (!cancelled) {
          reportCameraStartError();
        }
      });

    return () => {
      cancelled = true;
      void clearScanner();
    };
  }, [handleDecodedText, isDesktop, isOpen, reportCameraStartError, scannerId]);

  if (!isOpen) {
    return null;
  }

  const handleFile = async (file: File | null) => {
    if (file == null) return;

    setIsProcessingFile(true);
    try {
      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      const decodedText = await scanner.scanFile(file, true);
      await handleDecodedText(decodedText);
    } catch {
      onScanError(t("Could not read QR code from image."));
    } finally {
      void clearScanner();
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    await handleFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    await handleFile(file);
  };

  return (
    <div className="mt-4 rounded border border-black/10 bg-black/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-black">
          {isDesktop ? t("Upload QR image") : t("Scan QR code")}
        </p>
        <button
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-black shadow-sm transition-all hover:border-black/20 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/30"
          onClick={onClose}
          type="button"
        >
          {t("Close scanner")}
        </button>
      </div>

      {isDesktop ? (
        <>
          <label
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
              isDraggingFile
                ? "border-[#F7931A] bg-[#F7931A]/10"
                : "border-black/15 bg-white"
            }`}
            onDragEnter={() => setIsDraggingFile(true)}
            onDragLeave={() => setIsDraggingFile(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              void handleDrop(event);
            }}
          >
            <input
              accept="image/*"
              aria-label={t("Choose QR image")}
              className="sr-only"
              onChange={(event) => {
                void handleFileInputChange(event);
              }}
              type="file"
            />
            <span className="text-sm font-medium text-black">
              {t("Drop QR image here or choose a file.")}
            </span>
            {isProcessingFile && (
              <span className="mt-2 text-xs text-black/60">
                {t("Reading QR image...")}
              </span>
            )}
          </label>
          <div className="hidden" id={scannerId} />
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-black/60">
            {t("Point your camera at the QR code.")}
          </p>
          <div
            className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white"
            id={scannerId}
          />
        </>
      )}
    </div>
  );
};
