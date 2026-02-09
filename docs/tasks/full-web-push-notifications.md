# Full Web Push Notifications

## Summary
Implemented end-to-end Web Push notifications for recorded matches in the PWA, including:
- Vercel API endpoints for subscription lifecycle and match notification fan-out.
- Upstash Redis-backed subscription storage, channel auth, and event deduplication.
- Custom service worker with push handling and Workbox Background Sync for notify requests.
- Frontend push orchestration hook + settings UI + match record integration.

## Scope Delivered
- Added backend modules under `api/_lib` and endpoints under `api/push`.
- Added push client/auth/types under `src/lib/push`.
- Added `PushNotificationsProvider` and `PushNotificationsSection` UI.
- Registered service worker in app startup and switched PWA to `injectManifest` strategy.
- Triggered push enqueue after successful match insert completion.
- Added tests for push auth, queue behavior, service worker payload parsing, and match enqueue integration.

## Verification
- `yarn typecheck` passed.
- `yarn test --run` passed (all suites green).
- `yarn build` passed (including service worker injectManifest build).

## Review
- Backend channel auth is deterministic token-based and never transmits mnemonic.
- Sender-device suppression and event dedupe are both in place.
- Fallback retry queue remains active where Background Sync is unsupported.
- Remaining console warnings in existing tests (`act(...)`, chart sizing) are pre-existing quality issues and not regressions from this task.
