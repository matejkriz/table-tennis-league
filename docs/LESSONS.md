# Lessons learned
- For Vercel Node ESM functions, internal relative imports must include `.js` extension to avoid `ERR_MODULE_NOT_FOUND` at runtime.
- Do not trust local push UI state (`isEnabled`, test notification) as proof of backend deliverability; always surface and inspect backend subscription diagnostics (`subscriptionCount`, `totalSubscriptions`, `skippedSender`).
- When reading Redis hash payloads via Upstash client, handle both raw JSON strings and already-deserialized objects; assuming string-only can silently drop valid records.
- Web Push subscriptions can accumulate multiple valid endpoints for one physical device; enforce one active endpoint per `deviceId` at subscribe time and dedupe by `deviceId` at send time.
- Service worker notification `icon` and `badge` URLs must point to real static assets; invalid paths can silently degrade or hide desktop notification UI while push delivery still occurs.
