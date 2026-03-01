# Match Upset Pixelart

## Goal

Replace the `Projected change` section in `MatchRecorder` with a cute retro pixelart replay that appears only when an underdog wins.

## What Changed

- Added `src/components/MatchUpsetPixelArt.tsx` with a lightweight CSS-driven pixel animation:
  - two tiny pixel sprites,
  - looping ping-pong ball arc,
  - subtle winner/loser motion.
- Updated `src/components/MatchRecorder.tsx`:
  - removed the old `Projected change` render block,
  - added `upsetPreview` memo that checks underdog wins from team average ratings,
  - renders `MatchUpsetPixelArt` only for real upsets.
- Updated i18n in `src/i18n/locales/cs.json` with Czech strings for new replay copy.
- Updated `src/components/MatchRecorder.test.tsx`:
  - verifies upset replay appears for underdog selection,
  - verifies replay is hidden for favorite/equal-rating outcomes.

## Verification

- `./node_modules/.bin/vitest run src/components/MatchRecorder.test.tsx` passes (19/19).
- `./node_modules/.bin/tsc --noEmit` passes.
- IDE lints for changed files show no new issues.

## Notes

- Existing chart warnings in tests (recharts container width/height in jsdom) remain unchanged and are pre-existing behavior.
