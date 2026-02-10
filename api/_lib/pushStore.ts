import { Redis } from "@upstash/redis";

import type { PushSubscriptionRecord } from "./pushTypes.js";

const redis = Redis.fromEnv();
const EVENT_DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60;

const authKey = (channelId: string): string => `push:auth:${channelId}`;
const subscriptionsKey = (channelId: string): string => `push:subs:${channelId}`;
const eventKey = (channelId: string, eventId: string): string =>
  `push:event:${channelId}:${eventId}`;

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
  await redis.hset(subscriptionsKey(channelId), {
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
  const fields = await redis.hgetall<Record<string, string>>(subscriptionsKey(channelId));
  if (!fields) return [];

  return Object.values(fields)
    .map((value) => {
      try {
        return JSON.parse(value) as PushSubscriptionRecord;
      } catch {
        return null;
      }
    })
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
