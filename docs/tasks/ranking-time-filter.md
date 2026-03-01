# Ranking Time Filter

## Goal

Add ranking time-filter options on both the main Match page and the Stats page, based on each player's last recorded match date, without adding new persisted state.

## What Changed

- Added `src/utils/rankingTimeFilter.ts`:
  - derives each player's latest match timestamp from match history summaries (`match.playedAt` + participants),
  - filters ranking entries by `all`, `week`, `month`, and `quarter` windows.
- Updated `src/components/RankingList.tsx`:
  - added in-component filter controls (`Week`, `Month`, `Quarter`, `Anytime`) with label `Last match in:`,
  - applies derived filtering via `filterRankingByLastMatch(...)`,
  - shows a dedicated empty state for active time filters.
- Updated routes to pass match history summaries into ranking:
  - `src/routes/index.tsx`
  - `src/routes/stats.tsx`
- Added Czech i18n keys in `src/i18n/locales/cs.json` for the new filter labels and empty-state message.
- Added focused tests in `src/utils/rankingTimeFilter.test.ts` covering:
  - week/month/quarter behavior,
  - no-op `all` behavior,
  - latest-match derivation,
  - invalid-date handling.

## Verification

- `yarn test src/utils/rankingTimeFilter.test.ts` passes (5/5).
- `yarn typecheck` passes.
- Manual browser walkthrough confirms filters work on both Match and Stats Ranking sections.

## Review

- No schema/database changes were introduced.
- No extra state fields were added for "last match"; values are derived directly from existing match history data.
- The same filtering behavior is shared on both pages by reusing the same `RankingList` + utility logic.

## Follow-up: clearer filter copy

- Updated filter copy in `RankingList` to make the criteria explicit:
  - label: `Last match in:`
  - button order and labels: `Week`, `Month`, `Quarter`, `Anytime`
- Updated Czech translations in `src/i18n/locales/cs.json` for the new keys.
