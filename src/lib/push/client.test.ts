import { describe, expect, it, vi } from "vitest";

import type { MatchPushEvent } from "./types";
import {
  enqueueFallbackQueueItem,
  flushFallbackQueue,
  readFallbackQueue,
} from "./client";

const createMemoryStorage = (): Storage => {
  const state = new Map<string, string>();

  return {
    length: 0,
    clear: () => state.clear(),
    getItem: (key) => state.get(key) ?? null,
    key: (index) => Array.from(state.keys())[index] ?? null,
    removeItem: (key) => {
      state.delete(key);
    },
    setItem: (key, value) => {
      state.set(key, value);
    },
  };
};

const createEvent = (eventId: string): MatchPushEvent => ({
  channelId: "owner-1",
  authToken: "token",
  senderDeviceId: "device-a",
  locale: "en",
  eventId,
  playedAt: "2026-02-08T12:00:00.000Z",
  playerAName: "Alice",
  playerBName: "Bob",
  winnerName: "Alice",
  playerARating: 1508,
  playerBRating: 1492,
  playerARank: 1,
  playerBRank: 2,
});

describe("fallback push queue", () => {
  it("stores queued items in storage", () => {
    const storage = createMemoryStorage();

    enqueueFallbackQueueItem(storage, createEvent("evt-1"));
    enqueueFallbackQueueItem(storage, createEvent("evt-2"));

    const queue = readFallbackQueue(storage);

    expect(queue).toHaveLength(2);
    expect(queue[0]?.eventId).toBe("evt-1");
    expect(queue[1]?.eventId).toBe("evt-2");
  });

  it("flushes successful items and keeps failed ones", async () => {
    const storage = createMemoryStorage();

    enqueueFallbackQueueItem(storage, createEvent("evt-1"));
    enqueueFallbackQueueItem(storage, createEvent("evt-2"));

    const send = vi
      .fn<(event: MatchPushEvent) => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await flushFallbackQueue({ storage, send });

    expect(result.sent).toBe(1);
    expect(result.kept).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(readFallbackQueue(storage)).toEqual([createEvent("evt-2")]);
  });
});
