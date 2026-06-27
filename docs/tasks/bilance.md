# Bilance zapasu ve statistikach

## Summary

- Added win/loss counts to ranking entries produced by `useLeagueData`.
- Replaced the rating delta in the stats ranking row with `wins:losses`.
- Rendered wins in green and losses in a softer orange without adding a visible label.
- Removed unused initial-selection parameters in `src/routes/index.tsx` so lint passes.

## Verification

- `yarn test src/hooks/useLeagueData.test.ts src/routes/stats.test.tsx --run`
- `yarn test --run`
- `yarn lint`
- `yarn typecheck`
- `yarn test src/routes/index.test.tsx --run`
