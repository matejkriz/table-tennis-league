import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

interface LeagueShareQRProps {
  shareUrl: string | null;
  onCopyShareLink: () => void;
}

export const LeagueShareQR = ({
  shareUrl,
  onCopyShareLink,
}: LeagueShareQRProps) => {
  const { t } = useTranslation();

  if (shareUrl) {
    return (
      <div className="mt-4 rounded border border-black/10 bg-black/5 p-4">
        <div className="flex flex-col items-center gap-4">
          <QRCodeSVG
            aria-label={t("Share QR code for league")}
            bgColor="#FFFFFF"
            fgColor="#111111"
            imageSettings={{
              src: "/pwa-64x64.png",
              height: 28,
              width: 28,
              excavate: true,
            }}
            includeMargin
            level="H"
            role="img"
            size={220}
            title={t("Share QR code for league")}
            value={shareUrl}
          />
          <button
            className="rounded-full bg-[#F7931A] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#F7931A]/90 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/50"
            onClick={onCopyShareLink}
            type="button"
          >
            {t("Copy share link")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded border border-black/10 bg-black/5 p-4">
      <div className="flex flex-col items-center gap-4">
        <div
          className="animate-pulse rounded bg-black/10"
          style={{ width: 220, height: 220 }}
        />
        <div className="animate-pulse h-8 w-36 rounded-full bg-black/10" />
      </div>
      <p className="mt-4 text-center text-sm text-black/50">
        {t("Preparing share link...")}
      </p>
    </div>
  );
};
