# Cross Device Match Notifications Fix

## Summary
Fixed cross-device match push publishing so the sender device does not need local push enabled to emit match events.
Added subscription re-sync on app startup to keep backend state aligned after deploy/environment resets.

## Root cause
`enqueueMatchNotification` was gated by sender-side `isEnabled` and `isSupported`. That prevented match event publication when recording a match on a device that did not have push enabled, even though other devices had valid subscriptions.

## Changes
- Removed sender-side `isEnabled/isSupported` gate from `enqueueMatchNotification`.
- Removed the same state gate from fallback queue flushing logic.
- Added startup subscription re-sync (`subscribe` upsert) when push is enabled and permission is granted.
- Added `notify-match` diagnostics: `totalSubscriptions` and `skippedSender`.
- Removed duplicate `setStatusMessage(null)` call in enable flow.
- Kept authentication and deduplication behavior unchanged.

## Verification
- `yarn typecheck`
- `yarn test --run api/push/notify-match.test.ts`
- `yarn build`
