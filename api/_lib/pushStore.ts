import { Redis } from "@upstash/redis";

import type { PushSubscriptionRecord } from "./pushTypes.js";

const redis = Redis.fromEnv();
const EVENT_DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60;

const authKey = (channelId: string): string => `push:auth:${channelId}`;
const subscriptionsKey = (channelId: string): string => `push:subs:${channelId}`;
const eventKey = (channelId: string, eventId: string): string =>
  `push:event:${channelId}:${eventId}`;

const parseSubscriptionRecord = (
  value: unknown,
): PushSubscriptionRecord | null => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PushSubscriptionRecord;
    } catch {
      return null;
    }
  }

  if (typeof value !== "object" || value === null) return null;

  const record = value as Partial<PushSubscriptionRecord>;
  if (
    typeof record.endpoint !== "string" ||
    typeof record.deviceId !== "string" ||
    typeof record.locale !== "string" ||
    typeof record.updatedAt !== "string" ||
    typeof record.subscription !== "object" ||
    record.subscription === null
  ) {
    return null;
  }

  return record as PushSubscriptionRecord;
};

export const getChannelTokenHash = async (
  channelId: string,
): Promise<string | null> => {
  const value = await redis.get<string>(authKey(channelId));
  return value ?? null;
};

export const setChannelTokenHash = async (
  channelId: string,
  tokenHash: string,
): Promise<void> => {
  await redis.set(authKey(channelId), tokenHash);
};

export const upsertSubscription = async (
  channelId: string,
  record: PushSubscriptionRecord,
): Promise<void> => {
  const key = subscriptionsKey(channelId);
  const existing = await redis.hgetall<Record<string, unknown>>(key);

  if (existing) {
    const staleEndpoints = Object.entries(existing)
      .filter(([endpoint, value]) => {
        const parsed = parseSubscriptionRecord(value);
        return (
          !!parsed &&
          parsed.deviceId === record.deviceId &&
          endpoint !== record.endpoint
        );
      })
      .map(([endpoint]) => endpoint);

    if (staleEndpoints.length > 0) {
      await Promise.all(staleEndpoints.map((endpoint) => redis.hdel(key, endpoint)));
    }
  }

  await redis.hset(key, {
    [record.endpoint]: JSON.stringify(record),
  });
};

export const removeSubscription = async (
  channelId: string,
  endpoint: string,
): Promise<void> => {
  await redis.hdel(subscriptionsKey(channelId), endpoint);
};

export const listSubscriptions = async (
  channelId: string,
): Promise<ReadonlyArray<PushSubscriptionRecord>> => {
  const fields = await redis.hgetall<Record<string, unknown>>(
    subscriptionsKey(channelId),
  );
  if (!fields) return [];

  return Object.values(fields)
    .map((value) => parseSubscriptionRecord(value))
    .filter((value): value is PushSubscriptionRecord => value !== null);
};

export const countSubscriptions = async (channelId: string): Promise<number> => {
  const count = await redis.hlen(subscriptionsKey(channelId));
  return typeof count === "number" ? count : Number(count) || 0;
};

export const markEventIfNew = async (
  channelId: string,
  eventId: string,
): Promise<boolean> => {
  const result = await redis.set(eventKey(channelId, eventId), "1", {
    nx: true,
    ex: EVENT_DEDUPE_TTL_SECONDS,
  });

  return result === "OK";
};
