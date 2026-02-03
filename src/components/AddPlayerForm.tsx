import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatTypeError, useEvolu } from "../evolu/client";

const DEFAULT_RATING = "1000";

export const AddPlayerForm = () => {
  const { t } = useTranslation();
  const { insert } = useEvolu();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(DEFAULT_RATING);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const parsedRating = Number.parseFloat(rating);

    if (!Number.isFinite(parsedRating)) {
      setError(t("Please enter a valid initial rating."));
      return;
    }

    const insertResult = insert(
      "player",
      {
        name: trimmedName,
        initialRating: parsedRating,
      },
      {
        onComplete: () => {
          setName("");
          setRating(DEFAULT_RATING);
        },
      },
    );

    if (!insertResult.ok) {
      setError(formatTypeError(insertResult.error));
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Player name")}
          </span>
          <input
            autoComplete="off"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm placeholder:text-black/40 transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
            maxLength={100}
            placeholder={t("e.g. Katarína")}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-black/60">
            {t("Initial rating")}
          </span>
          <input
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base text-black shadow-sm placeholder:text-black/40 transition-all focus:border-[#F7931A] focus:outline-none focus:ring-2 focus:ring-[#F7931A]/20"
            min="0"
            step="0.01"
            type="number"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="text-sm text-black/60">{error}</p>
      )}
      <div className="flex justify-end pt-2">
        <button
          className="rounded-full bg-[#F7931A] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#F7931A]/90 hover:shadow-lg active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7931A]/50"
          type="submit"
        >
          {t("Add player")}
        </button>
      </div>
    </form>
  );
};
