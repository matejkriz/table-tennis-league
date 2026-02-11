import type {
  MatchPushEvent,
  PushNotifyMatchRequest,
  PushSubscribeRequest,
  PushUnsubscribeRequest,
} from "./types";

const FALLBACK_QUEUE_STORAGE_KEY = "push-notify-queue-v1";
const PUSH_DEVICE_ID_KEY = "push-device-id-v1";

const parseQueue = (rawValue: string | null): ReadonlyArray<MatchPushEvent> => {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ReadonlyArray<MatchPushEvent>;
  } catch {
    return [];
  }
};

const writeQueue = (storage: Storage, queue: ReadonlyArray<MatchPushEvent>): void => {
  storage.setItem(FALLBACK_QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

const postJson = async <TRequest extends object>(
  url: string,
  body: TRequest,
): Promise<Response> =>
  fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const toNotifyRequest = (event: MatchPushEvent): PushNotifyMatchRequest => ({
  channelId: event.channelId,
  authToken: event.authToken,
  senderDeviceId: event.senderDeviceId,
  locale: event.locale,
  eventId: event.eventId,
  playedAt: event.playedAt,
  playerAName: event.playerAName,
  playerBName: event.playerBName,
  winnerName: event.winnerName,
  playerARating: event.playerARating,
  playerBRating: event.playerBRating,
  playerARank: event.playerARank,
  playerBRank: event.playerBRank,
});

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const hasBackgroundSyncSupport = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "SyncManager" in window;

export const createPushEventId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getOrCreatePushDeviceId = (storage: Storage): string => {
  const existing = storage.getItem(PUSH_DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = createPushEventId();
  storage.setItem(PUSH_DEVICE_ID_KEY, deviceId);
  return deviceId;
};

export const readFallbackQueue = (storage: Storage): ReadonlyArray<MatchPushEvent> =>
  parseQueue(storage.getItem(FALLBACK_QUEUE_STORAGE_KEY));

export const enqueueFallbackQueueItem = (
  storage: Storage,
  item: MatchPushEvent,
): ReadonlyArray<MatchPushEvent> => {
  const queue = [...readFallbackQueue(storage), item];
  writeQueue(storage, queue);
  return queue;
};

export const flushFallbackQueue = async ({
  storage,
  send,
}: {
  readonly storage: Storage;
  readonly send: (event: MatchPushEvent) => Promise<boolean>;
}): Promise<{ readonly sent: number; readonly kept: number }> => {
  const queue = readFallbackQueue(storage);
  const kept: MatchPushEvent[] = [];
  let sent = 0;

  for (const item of queue) {
    const ok = await send(item);
    if (ok) sent += 1;
    else kept.push(item);
  }

  writeQueue(storage, kept);
  return { sent, kept: kept.length };
};

export const subscribePush = async (
  request: PushSubscribeRequest,
): Promise<boolean> => {
  const response = await postJson("/api/push/subscribe", request);
  return response.ok;
};

export const unsubscribePush = async (
  request: PushUnsubscribeRequest,
): Promise<boolean> => {
  const response = await postJson("/api/push/unsubscribe", request);
  return response.ok;
};

export const notifyMatchPush = async (
  event: MatchPushEvent,
): Promise<boolean> => {
  const response = await postJson("/api/push/notify-match", toNotifyRequest(event));
  return response.ok;
};

export const toApplicationServerKey = (value: string): ArrayBuffer => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const raw = atob(padded);
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
};
