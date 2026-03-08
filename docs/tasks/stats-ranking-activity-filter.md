# Stats Ranking Activity Filter

## Plan

- Add a Stats-page regression test that proves the ranking defaults to the persisted `Last 30 days` filter and updates for `Last 7 days` and `All`.
- Add a local-only preference hook backed by Evolu `_uiPreference.value` with default `30d`.
- Filter ranking entries on the Stats page by each player's latest match date without changing `useLeagueData()`'s public API.
- Keep Match history and header counts unchanged, and support filter-specific empty-state copy in `RankingList`.
- Verify with targeted tests and `yarn typecheck`.

## Review

- Added a persisted Stats ranking filter backed by local-only Evolu `_uiPreference` storage with `30d` as the default when no saved value exists.
- Filtered Stats ranking entries by each player's latest recorded match date while leaving Match history and summary counts unchanged.
- Added a native radio group for `Last 7 days`, `Last 30 days`, and `All`, plus a filter-specific empty state and Czech translations.
- Verification:
- `yarn vitest run src/routes/stats.test.tsx src/hooks/useStatsRankingFilterPreference.test.ts`
- `yarn vitest run src/hooks/useLeagueData.test.ts`
- `yarn typecheck`
