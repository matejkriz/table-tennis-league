# QR League Sharing With Encrypted Mnemonic

## Summary

Add QR-based league sharing in Settings -> Account & sync. The QR carries an app URL with encrypted mnemonic in `share` query param. Decryption password is the normalized league name (`trim + lowercase`), and league name is persisted as synced Evolu data.

## Scope

- Utility for token encode/decode with crypto + compression.
- Settings UI for generation and import in `OwnerSection`.
- Synced league-name storage in Evolu schema.
- i18n updates (English keys + Czech translations).
- Backward compatibility for existing `?key=` flow.

## Checkable Plan

- [x] Create `src/utils/mnemonicShare.ts` and `src/utils/mnemonicShare.test.ts`.
- [x] Add direct deps `qrcode.react` and `fflate`.
- [x] Extend `src/evolu/client.ts` with `leagueSetting` schema and query.
- [x] Implement QR generation/import UX in `src/components/OwnerSection.tsx`.
- [x] Add `src/components/OwnerSection.test.tsx`.
- [x] Add new translations in `src/i18n/locales/cs.json`.
- [x] Run verification commands and record outcomes.

## Review

### What Changed

- Added `mnemonicShare` codec utility with:
  - league-name normalization (`trim` + `lowercase`)
  - PBKDF2-HMAC-SHA-256 (250k iterations, 16-byte salt)
  - AES-256-GCM (12-byte IV)
  - optional `fflate` deflate compression (only when payload is smaller)
  - binary envelope v1 and base64url token encoding
- Extended Evolu schema with synced `leagueSetting` table and exported `leagueSettingsQuery`.
- Updated Account & sync (`OwnerSection`) with:
  - persistent/synced league-name input
  - visible QR code share block (`qrcode.react`, level `H`, centered app icon)
  - copy-share-link action
  - import panel when `share` query param is present
  - decryption + mnemonic validation + restore flow
  - URL cleanup (`share` param removed on successful import)
- Preserved existing legacy `?key=` restore flow in `src/evolu/client.ts`.
- Added Czech translations for all new sharing/import strings.
- Added test coverage for the new utility and component behavior.

### Verification

- `yarn test --run src/utils/mnemonicShare.test.ts src/components/OwnerSection.test.tsx src/utils/encryption.test.ts` ✅
- `yarn typecheck` ✅
- `yarn build` ✅
- `yarn lint` ❌ blocked by repository ESLint v9 config mismatch:
  - ESLint reported missing `eslint.config.(js|mjs|cjs)`

### Risks / Follow-ups

- Consider adding a stronger UX warning for weak league names since no minimum length is enforced.
- Consider adding a dedicated import route/entry banner if sharing becomes a primary onboarding path.
- Repository lint setup should be migrated to ESLint v9 flat config or pinned to ESLint v8 to restore lint verification.
