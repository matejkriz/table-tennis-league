# TODO - Push Cross-Device Reliability Follow-up

- [x] Auto re-sync existing granted subscription to backend on app start when permission is granted.
- [x] Remove duplicate `setStatusMessage(null)` in enable flow.
- [x] Add `totalSubscriptions` and `skippedSender` diagnostics to `notify-match` response.
- [x] Return `subscriptionCount` from `subscribe/unsubscribe` for easier runtime diagnostics.
- [x] Ensure only one active endpoint per `deviceId` during subscription upsert.
- [x] Deduplicate send fan-out by `deviceId` to avoid duplicate pushes on one physical device.
- [x] Prevent test-notification false-positive when service worker registration is missing.
- [x] Update tests for `notify-match` response shape changes.
- [x] Verify with `yarn typecheck`, `yarn test --run api/push/notify-match.test.ts`, `yarn build`.

# TODO - QR League Sharing With Encrypted Mnemonic

- [x] Add/share task documentation and implementation review file.
- [x] Add `mnemonicShare` utility with PBKDF2 + AES-GCM + optional deflate compression.
- [x] Add unit tests for share token encoding/decoding and failure modes.
- [x] Extend Evolu schema with synced `leagueSetting` and query exports.
- [x] Implement Account & sync QR share/import UI in `OwnerSection`.
- [x] Keep legacy `?key=` restore behavior intact.
- [x] Add i18n strings for new share/import copy (EN keys + Czech translations).
- [x] Add direct dependencies for `qrcode.react` and `fflate`.
- [ ] Verify with `yarn lint` (blocked: repository currently has no `eslint.config.*` for ESLint v9).
- [x] Verify with `yarn typecheck` and targeted tests.

# TODO - Start Onboarding Route With Share-Link Import

- [x] Add `/start` route and startup access helper (`startAccess`).
- [x] Redirect `/` to `/start` only for startup state (`0 matches` and `<=1 players`).
- [x] Restrict direct `/start` access when no `share` param and startup is complete.
- [x] Change QR share link target from `/settings` to `/start`.
- [x] Implement `/start` share-import-first flow with retry on wrong league name.
- [x] Implement add-self flow (fixed rating 1000) and redirect to Match page.
- [x] Implement no-share first-visit flow with share controls and fixed-rating player adding.
- [x] Keep sharing available in both Start and Settings.
- [x] Add tests for start access rules, `/start` behavior, and updated share URL contract.
- [ ] Verify with `yarn lint` (blocked: repository currently has no `eslint.config.*` for ESLint v9).
- [x] Run `yarn typecheck`, targeted tests, and `yarn build`.

# TODO - Player Management Follow-up Fixes

- [x] Add ESLint v9 flat config at repo root so `yarn lint` works.
- [x] Fix Czech locale string for "Rename, delete, or restore players." and remove duplicate `Restore`.
- [x] Pluralize active player count badge in `settings.players.tsx` via i18next `count`.
- [x] Verify with `yarn lint` and `yarn typecheck`.

# TODO - Push Notifications Fast Refresh Warning

- [x] Move the shared push notifications hook/context contract into a non-component module.
- [x] Verify with `yarn lint` and `yarn typecheck`.

# TODO - Deterministic QR Share With File/Camera Scan

- [x] Add task documentation and implementation review file.
- [x] Add `html5-qrcode` dependency and scanner wrapper for camera/file decode.
- [x] Rewrite `mnemonicShare` for deterministic hardcoded-key encoding and no league-name dependency.
- [x] Add failing tests for deterministic token behavior, URL auto-import, and scanner restore flows.
- [x] Remove league-name/password UI from Settings and Start share/import flows.
- [x] Add desktop file upload/drop-zone QR import and mobile camera scanner panel.
- [x] Update i18n strings for scan/import/loading/error copy.
- [x] Verify with `yarn test --run src/utils/mnemonicShare.test.ts src/components/OwnerSection.test.tsx src/routes/start.test.tsx` and `yarn typecheck`.

# TODO - Player Deletion Retention Expiry

- [x] Add a regression test proving recently deleted players disappear when the 30-day window elapses while the page stays open.
- [x] Replace the stale `useMemo([players])` time dependency in `settings.players.tsx` with deterministic expiry-driven state.
- [x] Verify with targeted tests, `npm run typecheck`, and lints for touched files.

# TODO - Stats Ranking Activity Filter

- [x] Add task documentation and review notes for the persisted Stats ranking activity filter.
- [x] Add failing route tests for the Stats page filter defaults, activity windows, persistence, and filtered empty state.
- [x] Add a local `_uiPreference` hook for the Stats ranking filter with default `30d`.
- [x] Implement the Stats page radio-group UI and ranking filtering by latest played match date.
- [x] Extend `RankingList` with configurable empty-state copy and add i18n strings.
- [x] Verify with `yarn vitest run src/routes/stats.test.tsx src/hooks/useStatsRankingFilterPreference.test.ts`, `yarn vitest run src/hooks/useLeagueData.test.ts`, and `yarn typecheck`.
