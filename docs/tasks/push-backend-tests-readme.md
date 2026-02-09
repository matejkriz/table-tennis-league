# Push Backend Tests + README

## Summary
- Added backend unit tests for push auth and notify handler.
- Updated README with Web Push setup instructions and required environment variables.

## Changes
- `api/_lib/pushAuth.test.ts` validates bootstrap and token match paths.
- `api/push/notify-match.test.ts` validates dedupe and send paths with mocks.
- `README.md` includes VAPID generation, env var configuration, and Vercel UI setup steps.

## Review
- Tests isolate backend logic and avoid real Redis/Web Push calls via mocks.
- README now documents the operational setup needed for push notifications.

## Verification
- `yarn typecheck`
- `yarn test --run` (warnings about `act(...)` and chart sizing are pre-existing)
- `yarn build`
