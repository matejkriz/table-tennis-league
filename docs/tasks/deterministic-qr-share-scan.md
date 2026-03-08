# Deterministic QR Share With File/Camera Scan

## Goal

Replace the league-name-password QR sharing flow with a deterministic hardcoded-key token, remove custom QR passwords, and add direct restore via in-app QR scanning.

## Planned Work

- Replace share token encoding/decoding so one mnemonic always maps to one QR token.
- Remove league-name input and password-dependent import from Settings and Start.
- Add `html5-qrcode`-based scanning:
  - mobile/tablet: live camera scanner
  - desktop: image file picker and drag/drop decode
- Auto-import `/start?share=...` without manual confirmation.
- Preserve the existing post-import onboarding step on `/start`.

## Review

- Replaced the share token codec with deterministic AES-GCM obfuscation driven by one hardcoded secret and a mnemonic-derived IV.
- Removed league-name/password-dependent QR generation and import from both Settings and `/start`.
- Added a reusable `LeagueShareScanner` surface backed by `html5-qrcode`:
  - coarse-pointer devices start live camera scanning
  - non-coarse devices use file upload plus drag/drop image decoding
- Made `/start?share=...` restore automatically and keep the existing add-yourself onboarding after a successful import.
- Updated Czech translations and component tests to the new share/scan contract.

## Verification

- `yarn test --run src/utils/mnemonicShare.test.ts src/components/OwnerSection.test.tsx src/routes/start.test.tsx`
- `yarn typecheck`
