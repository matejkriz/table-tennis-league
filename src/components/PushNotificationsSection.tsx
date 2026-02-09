import { useTranslation } from "react-i18next";

import { usePushNotifications } from "../hooks/usePushNotifications";

const formatPermission = (
  permission: NotificationPermission,
  t: (key: string) => string,
): string => {
  switch (permission) {
    case "granted":
      return t("Allowed");
    case "denied":
      return t("Blocked");
    default:
      return t("Not requested");
  }
};

export const PushNotificationsSection = () => {
  const { t } = useTranslation();
  const {
    isSupported,
    isEnabled,
    isSubscribed,
    permission,
    isBusy,
    hasBackgroundSync,
    error,
    enableNotifications,
    disableNotifications,
    reSubscribe,
    sendTestNotification,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <p className="text-sm text-black/60">
        {t("This browser does not support push notifications.")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-black/10 bg-black/5 p-4 text-sm text-black/70">
        <p>{t("Enable notifications to receive match updates on your other devices.")}</p>
        <p className="mt-2">
          {t("Permission")}: {formatPermission(permission, t)}
        </p>
        <p>
          {t("Subscription")}: {isSubscribed ? t("Active") : t("Inactive")}
        </p>
        <p>
          {t("Delivery mode")}: {hasBackgroundSync ? t("Background sync") : t("Fallback queue")}
        </p>
      </div>

      {error && <p className="text-sm text-black/60">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black transition-all hover:border-black/20"
          disabled={isBusy || isEnabled}
          onClick={() => {
            void enableNotifications();
          }}
          type="button"
        >
          {t("Enable notifications")}
        </button>

        <button
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black transition-all hover:border-black/20"
          disabled={isBusy || !isEnabled}
          onClick={() => {
            void disableNotifications();
          }}
          type="button"
        >
          {t("Disable notifications")}
        </button>

        <button
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black transition-all hover:border-black/20"
          disabled={isBusy || !isEnabled}
          onClick={() => {
            void reSubscribe();
          }}
          type="button"
        >
          {t("Re-subscribe")}
        </button>

        <button
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black transition-all hover:border-black/20"
          disabled={isBusy || !isEnabled || permission !== "granted"}
          onClick={() => {
            void sendTestNotification();
          }}
          type="button"
        >
          {t("Send test notification")}
        </button>
      </div>
    </div>
  );
};
