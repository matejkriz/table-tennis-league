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
