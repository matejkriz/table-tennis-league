import { createContext, use, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { evolu } from "../evolu/client";
import { deriveChannelAuthToken } from "../lib/push/auth";
import {
  createPushEventId,
  enqueueFallbackQueueItem,
  flushFallbackQueue,
  getOrCreatePushDeviceId,
  hasBackgroundSyncSupport,
  isPushSupported,
  notifyMatchPush,
  subscribePush,
  toApplicationServerKey,
  unsubscribePush,
} from "../lib/push/client";
import type {
  EnqueueMatchNotificationInput,
  MatchPushEvent,
} from "../lib/push/types";

interface PushNotificationsContextValue {
  readonly isSupported: boolean;
  readonly isEnabled: boolean;
  readonly isSubscribed: boolean;
  readonly permission: NotificationPermission;
  readonly isBusy: boolean;
  readonly hasBackgroundSync: boolean;
  readonly error: string | null;
  readonly statusMessage: string | null;
  readonly enableNotifications: () => Promise<boolean>;
  readonly disableNotifications: () => Promise<boolean>;
  readonly reSubscribe: () => Promise<boolean>;
  readonly sendTestNotification: () => Promise<boolean>;
  readonly enqueueMatchNotification: (
    input: EnqueueMatchNotificationInput,
  ) => Promise<boolean>;
}

const PUSH_ENABLED_STORAGE_KEY = "push-notifications-enabled-v1";

const defaultContextValue: PushNotificationsContextValue = {
  isSupported: false,
  isEnabled: false,
  isSubscribed: false,
  permission: "default",
  isBusy: false,
  hasBackgroundSync: false,
  error: null,
  statusMessage: null,
  enableNotifications: async () => false,
  disableNotifications: async () => false,
  reSubscribe: async () => false,
  sendTestNotification: async () => false,
  enqueueMatchNotification: async () => false,
};

const PushNotificationsContext =
  createContext<PushNotificationsContextValue>(defaultContextValue);

const getRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  return Promise.race<ServiceWorkerRegistration | null>([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 3000);
    }),
  ]);
};

const readEnabledPreference = (): boolean => {
  const raw = window.localStorage.getItem(PUSH_ENABLED_STORAGE_KEY);
  return raw === "1";
};

const writeEnabledPreference = (enabled: boolean): void => {
  window.localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, enabled ? "1" : "0");
};

export const PushNotificationsProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const { i18n, t } = useTranslation();
  const appOwner = use(evolu.appOwner);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [isBusy, setIsBusy] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(() =>
    typeof window === "undefined" ? false : readEnabledPreference(),
  );
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const supported = isPushSupported();
  const hasBackgroundSync = hasBackgroundSyncSupport();
  const channelId = appOwner?.id ?? null;

  const getContextFields = useCallback(() => {
    if (!channelId || !authToken) return null;

    const deviceId = getOrCreatePushDeviceId(window.localStorage);
    return {
      channelId,
      authToken,
      deviceId,
      locale: i18n.language || "en",
    };
  }, [authToken, channelId, i18n.language]);

  const sendEvent = useCallback(
    async (event: MatchPushEvent): Promise<boolean> => {
      try {
        return await notifyMatchPush(event);
      } catch {
        return false;
      }
    },
    [],
  );

  const flushFallback = useCallback(async (): Promise<void> => {
    if (hasBackgroundSync) return;

    await flushFallbackQueue({
      storage: window.localStorage,
      send: sendEvent,
    });
  }, [hasBackgroundSync, sendEvent]);

  useEffect(() => {
    if (!appOwner?.mnemonic) {
      setAuthToken(null);
      return;
    }

    void deriveChannelAuthToken(appOwner.mnemonic).then(setAuthToken);
  }, [appOwner?.mnemonic]);

  useEffect(() => {
    if (!supported) return;

    const syncState = async () => {
      const registration = await getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
      setPermission(Notification.permission);
    };

    void syncState();
  }, [supported]);

  useEffect(() => {
    if (hasBackgroundSync) return;

    void flushFallback();

    const handleOnline = () => {
      void flushFallback();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushFallback, hasBackgroundSync]);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    const context = getContextFields();
    if (!context) return false;

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError(t("Missing VITE_VAPID_PUBLIC_KEY."));
      return false;
    }

    setIsBusy(true);
    setError(null);
    setStatusMessage(null);
    setStatusMessage(null);

    try {
      const requestedPermission =
        permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        setError(t("Notification permission was not granted."));
        return false;
      }

      const registration = await getRegistration();
      if (!registration) return false;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toApplicationServerKey(vapidPublicKey),
        }));

      const ok = await subscribePush({
        channelId: context.channelId,
        authToken: context.authToken,
        deviceId: context.deviceId,
        locale: context.locale,
        subscription: subscription.toJSON(),
      });

      if (!ok) {
        setError(t("Failed to register push subscription."));
        return false;
      }

      setIsEnabled(true);
      setIsSubscribed(true);
      writeEnabledPreference(true);
      setStatusMessage(t("Notifications enabled."));
      return true;
    } finally {
      setIsBusy(false);
    }
  }, [getContextFields, permission, supported]);

  const disableNotifications = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    const context = getContextFields();
    if (!context) return false;

    setIsBusy(true);
    setError(null);

    try {
      const registration = await getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setIsEnabled(false);
        setIsSubscribed(false);
        writeEnabledPreference(false);
        setStatusMessage(t("Notifications disabled."));
        return true;
      }

      await unsubscribePush({
        channelId: context.channelId,
        authToken: context.authToken,
        subscription: subscription.toJSON(),
      });

      await subscription.unsubscribe();

      setIsEnabled(false);
      setIsSubscribed(false);
      writeEnabledPreference(false);
      setStatusMessage(t("Notifications disabled."));
      return true;
    } finally {
      setIsBusy(false);
    }
  }, [getContextFields, supported]);

  const reSubscribe = useCallback(async (): Promise<boolean> => {
    const disabled = await disableNotifications();
    if (!disabled) return false;
    return enableNotifications();
  }, [disableNotifications, enableNotifications]);

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    setError(null);
    setStatusMessage(null);

    if (!supported) {
      setError(t("Push is not supported in this browser."));
      return false;
    }

    if (Notification.permission !== "granted") {
      setError(t("Notification permission is not granted."));
      return false;
    }

    try {
      const registration = await getRegistration();
      if (registration) {
        await registration.showNotification("Table Tennis League", {
          body: "Push notifications are active.",
          tag: "ttl-test-notification",
          data: { url: "/" },
        });

        setStatusMessage(t("Test notification sent."));
        return true;
      }

      new Notification("Table Tennis League", {
        body: "Push notifications are active.",
      });
      setStatusMessage(t("Test notification sent."));
      return true;
    } catch (sendError) {
      setError(
        t("Test notification failed. Check browser/site notification settings."),
      );
      // eslint-disable-next-line no-console
      console.error(sendError);
      return false;
    }
  }, [supported, t]);

  const enqueueMatchNotification = useCallback(
    async (input: EnqueueMatchNotificationInput): Promise<boolean> => {
      const context = getContextFields();
      if (!context) return false;

      const event: MatchPushEvent = {
        channelId: context.channelId,
        authToken: context.authToken,
        senderDeviceId: context.deviceId,
        locale: context.locale,
        eventId: createPushEventId(),
        playedAt: input.playedAt,
        playerAName: input.playerAName,
        playerBName: input.playerBName,
        winnerName: input.winnerName,
      };

      const sent = await sendEvent(event);
      if (sent) return true;

      if (!hasBackgroundSync) {
        enqueueFallbackQueueItem(window.localStorage, event);
      }

      return false;
    },
    [getContextFields, hasBackgroundSync, sendEvent],
  );

  const contextValue = useMemo<PushNotificationsContextValue>(
    () => ({
      isSupported: supported,
      isEnabled,
      isSubscribed,
      permission,
      isBusy,
      hasBackgroundSync,
      error,
      statusMessage,
      enableNotifications,
      disableNotifications,
      reSubscribe,
      sendTestNotification,
      enqueueMatchNotification,
    }),
    [
      disableNotifications,
      enableNotifications,
      enqueueMatchNotification,
      error,
      hasBackgroundSync,
      isBusy,
      isEnabled,
      isSubscribed,
      permission,
      reSubscribe,
      sendTestNotification,
      statusMessage,
      supported,
    ],
  );

  return (
    <PushNotificationsContext.Provider value={contextValue}>
      {children}
    </PushNotificationsContext.Provider>
  );
};

export const usePushNotifications = (): PushNotificationsContextValue =>
  useContext(PushNotificationsContext);
