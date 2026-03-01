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
