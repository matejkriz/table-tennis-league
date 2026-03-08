# Player Management

## Plan

- Add failing tests for player-management behavior before implementation.
- Add `deletedAt` support and split active vs all player queries.
- Refactor league data to preserve deleted players in historical computations.
- Add settings navigation and `/settings/players` UI for rename, delete, and restore.
- Verify with targeted tests, typecheck, and lint.

## Review

- Added nullable `deletedAt` to `player` and introduced `allPlayersQuery` so active-player UX and historical player resolution are separated cleanly.
- Refactored `useLeagueData` to compute match history and ratings from all players while keeping `players` and `ranking` limited to active players.
- Added `/settings/players` with inline rename, one-tap soft delete, and restore for recently deleted players.
- Added settings entry navigation and Czech translations for the new player-management copy.
- Verified with `yarn vitest run src/hooks/useLeagueData.test.ts src/utils/startAccess.test.ts src/routes/settings.test.tsx src/routes/settings.players.test.tsx`.
- Verified with `yarn typecheck`.
- `yarn lint` is currently blocked at the repository level because ESLint v9 cannot find an `eslint.config.js|mjs|cjs` file.

## Follow-up fixes

- Added root `eslint.config.js` in ESLint v9 flat-config format with JS/TypeScript setup and test-file overrides, so lint is now discoverable and runnable.
- Updated Czech locale key `"Rename, delete, or restore players."` to distinct literal wording and removed duplicated `"Restore"` entry.
- Updated active-player badge rendering to use `t("players_count", { count })` pluralization with an English fallback path (`1 player`, `2 players`) when no `en` locale resource is present.
- Added a regression test for active-player badge pluralization in `src/routes/settings.players.test.tsx`.
- Verified with `npm run test -- --run src/routes/settings.players.test.tsx`, `npm run lint` (0 errors), and `npm run typecheck`.

## Retention expiry fix

- Replaced the stale `useMemo(() => splitPlayersByStatus(players, new Date()), [players])` path with `useRetentionWindowNow(players)`, which schedules a re-render at the next deleted-player expiry boundary.
- Tightened the retention comparison to exclude players once the full 30-day window has elapsed and capped timer scheduling to `2 ** 31 - 1` ms so long-lived sessions do not hit browser timeout overflow behavior.
- Added a regression test covering a page that stays open across the 30-day expiry boundary in `src/routes/settings.players.test.tsx`.
- Verified with `npm run test -- --run src/routes/settings.players.test.tsx`, `npm run typecheck`, and `npm run lint -- src/routes/settings.players.tsx src/routes/settings.players.test.tsx`.
