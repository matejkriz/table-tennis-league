# Main Page Duels

## Goal

Replace the main-page `Match history` section with `Duels`, driven by the currently active recorder section, while keeping the Stats page history unchanged.

## What Changed

- Added a new `DuelsHistory` wrapper for the main page:
  - singles source with one selected player shows all of that player’s matches,
  - singles source with two selected players shows only opposite-side head-to-head matches,
  - doubles source matches any historical match containing all currently selected doubles players, regardless of pairing,
  - empty selections and no-result states now show duel-specific messages.
- Extended `MatchRecorder` with an optional selection callback so the main route can track the currently selected singles or doubles players without adding more selectors.
- Added controlled-open support to `CollapsibleSection` and setter support to `useCollapsibleState`.
- Updated the main route so doubles mode keeps exactly one recorder section open at a time:
  - opening `Record match` closes `Record doubles match`,
  - opening `Record doubles match` closes `Record match`,
  - clicking the already open recorder section does nothing.
- Renamed the main-page history section to `Duels` and added Czech translations for the new copy.

## Review

- Focused tests passed:
  - `yarn test --run src/components/CollapsibleSection.test.tsx src/components/MatchRecorder.test.tsx src/components/DuelsHistory.test.tsx src/routes/index.test.tsx`
- TypeScript check passed:
  - `yarn typecheck`
- Notes:
  - Existing `MatchRecorder` chart warnings in jsdom still appear during tests and were already present before this change.
