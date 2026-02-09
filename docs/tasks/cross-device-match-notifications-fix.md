# Cross Device Match Notifications Fix

## Summary
Fixed cross-device match push publishing so the sender device does not need local push enabled to emit match events.

## Root cause
`enqueueMatchNotification` was gated by sender-side `isEnabled` and `isSupported`. That prevented match event publication when recording a match on a device that did not have push enabled, even though other devices had valid subscriptions.

## Changes
- Removed sender-side `isEnabled/isSupported` gate from `enqueueMatchNotification`.
- Removed the same state gate from fallback queue flushing logic.
- Kept authentication and deduplication behavior unchanged.

## Verification
- `yarn typecheck`
- `yarn test --run`
- `yarn build`
