# Test Notification UX Fix

## Summary
Improved the test notification action so it no longer appears silent. The UI now reports success or failure explicitly and service worker registration lookup is more resilient.

## Changes
- Added `statusMessage` to push notification context and surfaced it in settings.
- Improved service worker registration lookup with `getRegistration()` + timeout fallback.
- Added fallback to `new Notification(...)` when SW registration is unavailable.
- Standardized test-action errors to user-facing messages.
- Added Czech translations for new status/error texts.

## Review
This addresses the main usability issue: clicking `Send test notification` now always provides visible feedback in the app, even when OS/system notification behavior is suppressed or delayed.

## Verification
- `yarn typecheck`
- `yarn test --run`
- `yarn build`
