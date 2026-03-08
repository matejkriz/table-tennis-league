import { createContext, useContext } from "react";

import type { EnqueueMatchNotificationInput } from "../lib/push/types";

export interface PushNotificationsContextValue {
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

export const PushNotificationsContext =
  createContext<PushNotificationsContextValue>(defaultContextValue);

export const usePushNotifications = (): PushNotificationsContextValue =>
  useContext(PushNotificationsContext);
