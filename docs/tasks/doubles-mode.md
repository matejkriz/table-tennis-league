# Doubles mode (`čtyřhra`)

## Scope

- Added a shared account-synced doubles setting in Settings.
- Added 2v2 team selection UI in match recorder when doubles is enabled.
- Implemented doubles STR calculation using team average Elo and proportional teammate split.

## Review

- Focused tests passed:
  - `yarn vitest run src/hooks/useLeagueData.test.ts src/components/MatchRecorder.test.tsx`
- TypeScript check passed:
  - `yarn typecheck`
- Manual UI walkthrough completed:
  - Enabled doubles in Settings
  - Recorded a 2v2 match
  - Verified winner buttons show both team members
  - Verified match history displays team-vs-team text and four rating delta cards

## Follow-up adjustments

- Kept `Record match` (singles) as the first section on the main page.
- Added `Record doubles match` as a second section only when doubles is enabled.
- Refactored `MatchRecorder` to explicit `mode` prop (`singles` / `doubles`) to avoid replacing singles behavior.
- Redesigned doubles selectors into two team columns, removed row separator between teammate rows, and kept a team divider with a responsive stacked mobile layout.
