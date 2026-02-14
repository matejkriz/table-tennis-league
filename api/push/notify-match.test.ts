import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handler } from "./notify-match";

vi.mock("../_lib/pushAuth", () => ({
  verifyChannelAuth: vi.fn(),
}));

vi.mock("../_lib/pushStore", () => ({
  clearEventMark: vi.fn(),
  listSubscriptions: vi.fn(),
  markEventIfNew: vi.fn(),
  removeSubscription: vi.fn(),
}));

vi.mock("../_lib/pushSend", () => ({
  sendMatchPush: vi.fn(),
}));

import { verifyChannelAuth } from "../_lib/pushAuth";
import {
  clearEventMark,
  listSubscriptions,
  markEventIfNew,
  removeSubscription,
} from "../_lib/pushStore";
import { sendMatchPush } from "../_lib/pushSend";

const createResponse = () => {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as VercelResponse;

  return response;
};

const createRequest = (body: object): VercelRequest =>
  ({ method: "POST", body } as VercelRequest);

describe("notify-match handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("returns deduped=true when event was already processed", async () => {
    vi.mocked(verifyChannelAuth).mockResolvedValueOnce(true);
    vi.mocked(markEventIfNew).mockResolvedValueOnce(false);

    const response = createResponse();

    await handler(
      createRequest({
        channelId: "channel-1",
        authToken: "token",
        senderDeviceId: "device-1",
        locale: "en",
        eventId: "evt-1",
        playedAt: "2026-02-08T12:00:00.000Z",
        playerAName: "Alice",
        playerBName: "Bob",
        winnerName: "Alice",
        playerARating: 1550,
        playerBRating: 1450,
        playerARank: 1,
        playerBRank: 2,
      }),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, deduped: true }),
    );
    expect(sendMatchPush).not.toHaveBeenCalled();
  });

  it("sends notifications when event is new", async () => {
    vi.mocked(verifyChannelAuth).mockResolvedValueOnce(true);
    vi.mocked(markEventIfNew).mockResolvedValueOnce(true);
    vi.mocked(listSubscriptions).mockResolvedValueOnce([
      {
        endpoint: "endpoint-1",
        deviceId: "device-2",
        locale: "en",
        updatedAt: "2026-02-08T12:00:00.000Z",
        subscription: { endpoint: "endpoint-1" },
      },
    ]);
    vi.mocked(sendMatchPush).mockResolvedValueOnce({
      totalSubscriptions: 1,
      skippedSender: 0,
      attempted: 1,
      sent: 1,
      failed: 0,
      staleEndpoints: [],
    });

    const response = createResponse();

    await handler(
      createRequest({
        channelId: "channel-1",
        authToken: "token",
        senderDeviceId: "device-1",
        locale: "en",
        eventId: "evt-2",
        playedAt: "2026-02-08T12:00:00.000Z",
        playerAName: "Alice",
        playerBName: "Bob",
        winnerName: "Alice",
        playerARating: 1550,
        playerBRating: 1450,
        playerARank: 1,
        playerBRank: 2,
      }),
      response,
    );

    expect(sendMatchPush).toHaveBeenCalledTimes(1);
    expect(removeSubscription).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, deduped: false, sent: 1 }),
    );
  });

  it("rejects request when winnerName does not match either player", async () => {
    const response = createResponse();

    await handler(
      createRequest({
        channelId: "channel-1",
        authToken: "token",
        senderDeviceId: "device-1",
        locale: "en",
        eventId: "evt-3",
        playedAt: "2026-02-08T12:00:00.000Z",
        playerAName: "Alice",
        playerBName: "Bob",
        winnerName: "Charlie",
        playerARating: 1550,
        playerBRating: 1450,
        playerARank: 1,
        playerBRank: 2,
      }),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      ok: false,
      error: "InvalidBody",
    });
    expect(verifyChannelAuth).not.toHaveBeenCalled();
    expect(sendMatchPush).not.toHaveBeenCalled();
  });

  it("accepts request when winnerName matches playerBName", async () => {
    vi.mocked(verifyChannelAuth).mockResolvedValueOnce(true);
    vi.mocked(markEventIfNew).mockResolvedValueOnce(true);
    vi.mocked(listSubscriptions).mockResolvedValueOnce([]);
    vi.mocked(sendMatchPush).mockResolvedValueOnce({
      totalSubscriptions: 0,
      skippedSender: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      staleEndpoints: [],
    });

    const response = createResponse();

    await handler(
      createRequest({
        channelId: "channel-1",
        authToken: "token",
        senderDeviceId: "device-1",
        locale: "en",
        eventId: "evt-4",
        playedAt: "2026-02-08T12:00:00.000Z",
        playerAName: "Alice",
        playerBName: "Bob",
        winnerName: "Bob",
        playerARating: 1550,
        playerBRating: 1450,
        playerARank: 1,
        playerBRank: 2,
      }),
      response,
    );

    expect(sendMatchPush).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, deduped: false }),
    );
  });

  it("rejects request when rating fields are missing", async () => {
    const response = createResponse();

    await handler(
      createRequest({
        channelId: "channel-1",
        authToken: "token",
        senderDeviceId: "device-1",
        locale: "en",
        eventId: "evt-5",
        playedAt: "2026-02-08T12:00:00.000Z",
        playerAName: "Alice",
        playerBName: "Bob",
        winnerName: "Alice",
        // Missing rating and rank fields
      }),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      ok: false,
      error: "InvalidBody",
    });
  });

  it("creates payload factory that generates locale-specific notifications", async () => {
    vi.mocked(verifyChannelAuth).mockResolvedValueOnce(true);
    vi.mocked(markEventIfNew).mockResolvedValueOnce(true);
    vi.mocked(listSubscriptions).mockResolvedValueOnce([
      {
        endpoint: "endpoint-1",
        deviceId: "device-2",
        locale: "cs",
        updatedAt: "2026-02-08T12:00:00.000Z",
        subscription: { endpoint: "endpoint-1" },
      },
    ]);

    let capturedPayloadFactory: ((locale: string) => unknown) | null = null;
    vi.mocked(sendMatchPush).mockImplementation(async (args) => {
      capturedPayloadFactory = args.payloadFactory as (locale: string) => unknown;
      return {
        totalSubscriptions: 1,
        skippedSender: 0,
        attempted: 1,
        sent: 1,
        failed: 0,
        staleEndpoints: [],
      };
    });

    const response = createResponse();

    await handler(
      createRequest({
        channelId: "channel-1",
        authToken: "token",
        senderDeviceId: "device-1",
        locale: "en",
        eventId: "evt-6",
        playedAt: "2026-02-08T12:00:00.000Z",
        playerAName: "Alice",
        playerBName: "Bob",
        winnerName: "Alice",
        playerARating: 1550,
        playerBRating: 1450,
        playerARank: 1,
        playerBRank: 2,
      }),
      response,
    );

    expect(capturedPayloadFactory).not.toBeNull();
    if (capturedPayloadFactory) {
      const enPayload = capturedPayloadFactory("en") as { title: string; body: string };
      const csPayload = capturedPayloadFactory("cs") as { title: string; body: string };

      expect(enPayload.title).toBe("Satoshi's League");
      expect(enPayload.body).toContain("defeated");
      expect(enPayload.body).toContain("#1 Alice (1550)");
      expect(enPayload.body).toContain("#2 Bob (1450)");

      expect(csPayload.title).toBe("Satoshiho liga");
      expect(csPayload.body).toContain("vítězí nad");
      expect(csPayload.body).toContain("#1 Alice (1550)");
      expect(csPayload.body).toContain("#2 Bob (1450)");
    }
  });

  it("clears dedupe mark when sendMatchPush throws so retries are not lost", async () => {
    vi.mocked(verifyChannelAuth).mockResolvedValueOnce(true);
    vi.mocked(markEventIfNew).mockResolvedValueOnce(true);
    vi.mocked(listSubscriptions).mockResolvedValueOnce([
      {
        endpoint: "endpoint-1",
        deviceId: "device-2",
        locale: "en",
        updatedAt: "2026-02-08T12:00:00.000Z",
        subscription: { endpoint: "endpoint-1" },
      },
    ]);
    vi.mocked(sendMatchPush).mockRejectedValueOnce(new Error("WebPush failed"));
    vi.mocked(clearEventMark).mockResolvedValueOnce(undefined);

    const response = createResponse();

    await expect(
      handler(
        createRequest({
          channelId: "channel-1",
          authToken: "token",
          senderDeviceId: "device-1",
          locale: "en",
          eventId: "evt-retry",
          playedAt: "2026-02-08T12:00:00.000Z",
          playerAName: "Alice",
          playerBName: "Bob",
          winnerName: "Alice",
          playerARating: 1550,
          playerBRating: 1450,
          playerARank: 1,
          playerBRank: 2,
        }),
        response,
      ),
    ).rejects.toThrow("WebPush failed");

    expect(markEventIfNew).toHaveBeenCalledWith("channel-1", "evt-retry");
    expect(clearEventMark).toHaveBeenCalledWith("channel-1", "evt-retry");
  });

  it("clears dedupe mark when listSubscriptions throws", async () => {
    vi.mocked(verifyChannelAuth).mockResolvedValueOnce(true);
    vi.mocked(markEventIfNew).mockResolvedValueOnce(true);
    vi.mocked(listSubscriptions).mockRejectedValueOnce(
      new Error("Redis connection lost"),
    );
    vi.mocked(clearEventMark).mockResolvedValueOnce(undefined);

    const response = createResponse();

    await expect(
      handler(
        createRequest({
          channelId: "channel-1",
          authToken: "token",
          senderDeviceId: "device-1",
          locale: "en",
          eventId: "evt-redis-fail",
          playedAt: "2026-02-08T12:00:00.000Z",
          playerAName: "Alice",
          playerBName: "Bob",
          winnerName: "Alice",
          playerARating: 1550,
          playerBRating: 1450,
          playerARank: 1,
          playerBRank: 2,
        }),
        response,
      ),
    ).rejects.toThrow("Redis connection lost");

    expect(markEventIfNew).toHaveBeenCalledWith("channel-1", "evt-redis-fail");
    expect(sendMatchPush).not.toHaveBeenCalled();
    expect(clearEventMark).toHaveBeenCalledWith("channel-1", "evt-redis-fail");
  });
});
