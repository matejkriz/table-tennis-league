# Lessons learned
- For Vercel Node ESM functions, internal relative imports must include `.js` extension to avoid `ERR_MODULE_NOT_FOUND` at runtime.
- Do not trust local push UI state (`isEnabled`, test notification) as proof of backend deliverability; always surface and inspect backend subscription diagnostics (`subscriptionCount`, `totalSubscriptions`, `skippedSender`).
