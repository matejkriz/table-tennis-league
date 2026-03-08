# Push Notifications Fast Refresh Warning

## Task

Split the shared push notifications hook/context API away from the provider component so `react-refresh/only-export-components` stops warning on `src/hooks/usePushNotifications.tsx`.

## Review

- Moved the context value type, context instance, and `usePushNotifications()` hook into `src/hooks/pushNotificationsContext.ts`.
- Kept `src/hooks/usePushNotifications.tsx` focused on exporting the `PushNotificationsProvider` component.
- Updated hook consumers and tests to import from the new shared module.
- Verified with `yarn lint` and `yarn typecheck`.
