# Lessons learned
- For Vercel Node ESM functions, internal relative imports must include `.js` extension to avoid `ERR_MODULE_NOT_FOUND` at runtime.
