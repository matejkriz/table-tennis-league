# Match Recorder Empty Default Selection

## Summary

The match recorder started with implicit selections because the component initialized `playerAId`, `playerBId`, and `winnerTeam` with concrete defaults. The same assumption existed in the route-level selection state, and the reconciliation helper also auto-filled empty slots with the first available players.

## Review

- Root cause confirmed in [src/components/MatchRecorder.tsx](/Users/matejkriz/Projects/table-tennis-league/src/components/MatchRecorder.tsx): `playerAId`, `playerBId`, and `winnerTeam` were initialized to the first two players and team A.
- Follow-on cause confirmed in [src/utils/reconcileSelection.ts](/Users/matejkriz/Projects/table-tennis-league/src/utils/reconcileSelection.ts): empty slots were treated the same as removed selections, so a later reconciliation repopulated them automatically.
- Route state aligned in [src/routes/index.tsx](/Users/matejkriz/Projects/table-tennis-league/src/routes/index.tsx) so duel filtering no longer assumes two selected players before the user picks any.
- Regression coverage updated in [src/components/MatchRecorder.test.tsx](/Users/matejkriz/Projects/table-tennis-league/src/components/MatchRecorder.test.tsx) to require an empty initial state and to preserve empty slots across roster changes while still replacing removed selected players.

## Verification

- `yarn vitest run src/components/MatchRecorder.test.tsx`
- `yarn vitest run src/routes/index.test.tsx`
- `yarn typecheck`
