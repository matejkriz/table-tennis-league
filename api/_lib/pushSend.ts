import type { MatchPushPayload, PushSubscriptionRecord } from "./pushTypes.js";

interface WebPushApi {
  readonly setVapidDetails: (
    subject: string,
    publicKey: string,
    privateKey: string,
  ) => void;
  readonly sendNotification: (
    subscription: unknown,
    payload: string,
  ) => Promise<void>;
}

let cachedWebPush: WebPushApi | null = null;

const getWebPush = async (): Promise<WebPushApi> => {
  if (cachedWebPush) return cachedWebPush;

  const module = await import("web-push");
  const value = (module as { readonly default?: unknown }).default ?? module;
  const webPush = value as WebPushApi;

  cachedWebPush = webPush;
  return webPush;
};

const getVapidConfig = (): {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
} => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Missing VAPID configuration.");
  }

  return { publicKey, privateKey, subject };
};

const configureWebPush = async (): Promise<void> => {
  const webPush = await getWebPush();
  const { publicKey, privateKey, subject } = getVapidConfig();
  webPush.setVapidDetails(subject, publicKey, privateKey);
};

export const sendMatchPush = async ({
  subscriptions,
  senderDeviceId,
  payloadFactory,
}: {
  readonly subscriptions: ReadonlyArray<PushSubscriptionRecord>;
  readonly senderDeviceId: string;
  readonly payloadFactory: (locale: string) => MatchPushPayload;
}): Promise<{
  readonly totalSubscriptions: number;
  readonly skippedSender: number;
  readonly attempted: number;
  readonly sent: number;
  readonly failed: number;
  readonly staleEndpoints: ReadonlyArray<string>;
}> => {
  await configureWebPush();

  const webPush = await getWebPush();

  const latestByDeviceId = new Map<string, PushSubscriptionRecord>();
  for (const record of subscriptions) {
    const existing = latestByDeviceId.get(record.deviceId);
    if (!existing || record.updatedAt > existing.updatedAt) {
      latestByDeviceId.set(record.deviceId, record);
    }
  }

  const staleEndpoints: string[] = [];
  let skippedSender = 0;
  let attempted = 0;
  let sent = 0;
  let failed = 0;

  // When only the sender device is subscribed, send to it anyway
  // so single-device setups can verify push notifications work end-to-end.
  const skipSender = latestByDeviceId.size > 1;

  for (const record of latestByDeviceId.values()) {
    if (skipSender && record.deviceId === senderDeviceId) {
      skippedSender += 1;
      continue;
    }

    attempted += 1;

    try {
      const payload = payloadFactory(record.locale);
      await webPush.sendNotification(record.subscription, JSON.stringify(payload));
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode =
        typeof error === "object" &&
        error &&
        "statusCode" in error &&
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : null;

      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(record.endpoint);
      }
    }
  }

  return {
    totalSubscriptions: latestByDeviceId.size,
    skippedSender,
    attempted,
    sent,
    failed,
    staleEndpoints,
  };
};
