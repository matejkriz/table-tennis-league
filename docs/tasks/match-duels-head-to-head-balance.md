# Match duels head-to-head balance

## Summary

- Added a compact head-to-head balance block at the top of `DuelsHistory` when two singles players are selected.
- The balance is derived from the same filtered duel history, including matches where the selected players were on opposite sides in doubles.
- Kept the UI unframed and minimal with a small section label, player names, and centered score.
- Applied the shared score color semantics: higher/positive values are green and lower/negative values are orange.
- Added Czech translation for the new label.

## Verification

- `yarn test src/components/DuelsHistory.test.tsx --run`
- `yarn test src/components/MatchHistory.test.tsx src/components/DuelsHistory.test.tsx --run`
- `yarn test src/routes/stats.test.tsx src/routes/index.test.tsx src/components/MatchHistory.test.tsx src/components/DuelsHistory.test.tsx --run`
- `yarn test src/routes/index.test.tsx src/components/DuelsHistory.test.tsx --run`
- `yarn typecheck`
- `yarn lint`
- `yarn test --run`
