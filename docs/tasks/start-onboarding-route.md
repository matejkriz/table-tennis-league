# Start Onboarding Route With Share-Link Import

## Summary

Add `/start` onboarding as the app entry for leagues that have no matches and at most one player. Share links should open `/start?share=...`, where the user is asked for league name immediately, can retry on failure, and after success is prompted to add themselves with fixed rating 1000 before redirecting to Match.

## Scope

- New route: `/start`
- Startup access helper and route gating rules
- Share URL target change to `/start`
- `/start` onboarding UI for both share and no-share entry
- Tests for access rules and `/start` behavior

## Checkable Plan

- [x] Add `src/utils/startAccess.ts` and tests.
- [x] Update `buildShareUrl` to generate `/start?share=...`.
- [x] Add `src/routes/start.tsx` with share-import and onboarding flows.
- [x] Update root Match route (`/`) to redirect to `/start` in startup state.
- [x] Keep Start out of navigation menu.
- [x] Update tests for OwnerSection share link path.
- [x] Add Czech translations for new start page strings.
- [x] Run verification commands and document output.

## Review

### What Changed

- Added startup access helpers in `src/utils/startAccess.ts` and integrated them into `/` and `/start` route behavior.
- Added new `/start` route with two entry modes:
  - no-share onboarding mode (league name + QR/copy + fixed-rating player add)
  - share-import mode (immediate league-name prompt, retry on error, add-self step after successful restore)
- Updated share URL generation to target `/start?share=...`.
- Kept sharing controls available in both Start and Settings.
- Added test coverage for:
  - start access rules
  - `/start` behavior across share and no-share flows
  - updated share-link path in existing tests
- Added Czech translations for all new start-page strings.

### Verification

- `yarn typecheck` ✅
- `yarn test --run src/utils/mnemonicShare.test.ts src/components/OwnerSection.test.tsx src/utils/startAccess.test.ts src/routes/start.test.tsx src/utils/encryption.test.ts` ✅
- `yarn build` ✅
- `yarn lint` not run (repository currently lacks `eslint.config.*` for ESLint v9)

### Risks / Follow-ups

- `start.tsx` and `OwnerSection.tsx` currently duplicate parts of league-share UI logic; consider extracting a shared component/hook if this flow grows.
- Existing large-bundle warning remains unchanged from previous builds.
