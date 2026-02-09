# Vercel ESM Import Fix

## Summary
Fixed Vercel Preview runtime error by adding explicit `.js` extensions to internal API imports, which is required for Node ESM resolution in serverless functions.

## Changes
- Added `.js` suffixes to internal `api/_lib` imports in `api/push/*.ts`.
- Added `.js` suffixes to internal imports in `api/_lib` modules.

## Review
This change aligns with Node ESM module resolution rules and prevents `ERR_MODULE_NOT_FOUND` for internal modules in Vercel functions.

## Verification
- `yarn test --run api/_lib/pushAuth.test.ts api/push/notify-match.test.ts`
