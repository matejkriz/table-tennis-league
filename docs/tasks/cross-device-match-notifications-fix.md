# Cross Device Match Notifications Fix

## Summary
Fixed cross-device match push publishing so the sender device does not need local push enabled to emit match events.
Added subscription re-sync on app startup to keep backend state aligned after deploy/environment resets.

## Root cause
`enqueueMatchNotification` was gated by sender-side `isEnabled` and `isSupported`. That prevented match event publication when recording a match on a device that did not have push enabled, even though other devices had valid subscriptions.
On backend, Redis `hgetall` values could already be returned as deserialized objects by Upstash client, but parser expected JSON strings only and dropped all records. This produced `totalSubscriptions: 0` even when Redis hash had entries.

## Changes
- Removed sender-side `isEnabled/isSupported` gate from `enqueueMatchNotification`.
- Removed the same state gate from fallback queue flushing logic.
- Added startup subscription re-sync (`subscribe` upsert) whenever notification permission is granted and a browser subscription exists.
- Added `notify-match` diagnostics: `totalSubscriptions` and `skippedSender`.
- Added `subscribe/unsubscribe` diagnostics: `subscriptionCount`.
- Updated test notification behavior to fail clearly when no active service worker registration exists (no local fallback false-positive).
- Updated backend subscription parser to handle both JSON string values and already-deserialized object values from Redis client.
- Removed duplicate `setStatusMessage(null)` call in enable flow.
- Kept authentication and deduplication behavior unchanged.

## Verification
- `yarn typecheck`
- `yarn test --run api/push/notify-match.test.ts`
- `yarn build`
