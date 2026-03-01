import { useTranslation } from "react-i18next";

interface MatchUpsetPixelArtProps {
  readonly winnerLabel: string;
  readonly loserLabel: string;
}

const WINNER_PATTERN = [
  "00111100",
  "01111110",
  "01100110",
  "00111100",
  "00111100",
  "01111110",
  "11011011",
  "11000011",
];

const LOSER_PATTERN = [
  "00111100",
  "01111110",
  "01100110",
  "00111100",
  "00111100",
  "01111110",
  "11000011",
  "10100101",
];

const PIXEL = 6;

const Sprite = ({
  pattern,
  color,
  accent,
}: {
  readonly pattern: ReadonlyArray<string>;
  readonly color: string;
  readonly accent: string;
}) => (
  <div className="relative h-12 w-12 shrink-0 rounded-md border border-black/10 bg-white/80 p-1 shadow-sm">
    {pattern.map((row, y) =>
      row.split("").map((value, x) => {
        if (value === "0") return null;
        const tone = y < 2 ? accent : color;
        return (
          <span
            key={`${x}-${y}`}
            className="absolute"
            style={{
              left: x * (PIXEL / 2) + 4,
              top: y * (PIXEL / 2) + 4,
              width: PIXEL / 2,
              height: PIXEL / 2,
              backgroundColor: tone,
              imageRendering: "pixelated",
            }}
          />
        );
      }),
    )}
  </div>
);

export const MatchUpsetPixelArt = ({
  winnerLabel,
  loserLabel,
}: MatchUpsetPixelArtProps) => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden rounded-xl border border-[#F7931A]/40 bg-[#fff7ee] p-4">
      <style>
        {`
          @keyframes upsetBall {
            0% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(40px, -10px) scale(1); }
            50% { transform: translate(82px, -2px) scale(1.1); }
            75% { transform: translate(48px, -18px) scale(1); }
            100% { transform: translate(96px, 0) scale(1); }
          }

          @keyframes winnerBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }

          @keyframes loserTilt {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-7deg); }
          }

          .upset-ball {
            animation: upsetBall 1.8s steps(6, end) infinite;
          }

          .winner-bounce {
            animation: winnerBounce 0.6s steps(2, end) infinite;
          }

          .loser-tilt {
            animation: loserTilt 0.9s steps(3, end) infinite;
          }
        `}
      </style>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A35A15]">
        {t("Upset replay")}
      </p>
      <div className="mb-3 rounded-lg border border-black/10 bg-white/80 p-3">
        <div className="relative flex items-end justify-between gap-3">
          <div className="winner-bounce flex flex-col items-center gap-1">
            <Sprite pattern={WINNER_PATTERN} color="#F7931A" accent="#FFE2BF" />
            <span className="max-w-20 truncate text-[10px] font-semibold text-[#8A470A]">
              {winnerLabel}
            </span>
          </div>

          <div className="absolute left-6 right-6 top-1/2 h-[2px] -translate-y-1/2 bg-[#A35A15]/30" />
          <div className="upset-ball absolute left-10 top-[46%] h-2.5 w-2.5 rounded-full border border-black/20 bg-white shadow-sm" />

          <div className="loser-tilt flex flex-col items-center gap-1">
            <Sprite pattern={LOSER_PATTERN} color="#3B82F6" accent="#DCEBFF" />
            <span className="max-w-20 truncate text-[10px] font-semibold text-[#365FA8]">
              {loserLabel}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-black/70">
        {t("Lucky net-cord! {{winner}} stuns {{loser}}.", {
          winner: winnerLabel,
          loser: loserLabel,
        })}
      </p>
    </section>
  );
};
