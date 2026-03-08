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
