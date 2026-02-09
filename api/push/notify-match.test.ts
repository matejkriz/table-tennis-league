import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handler } from "./notify-match";

vi.mock("../_lib/pushAuth", () => ({
  verifyChannelAuth: vi.fn(),
}));

vi.mock("../_lib/pushStore", () => ({
  listSubscriptions: vi.fn(),
  markEventIfNew: vi.fn(),
  removeSubscription: vi.fn(),
}));

vi.mock("../_lib/pushSend", () => ({
  sendMatchPush: vi.fn(),
}));

import { verifyChannelAuth } from "../_lib/pushAuth";
import {
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
      }),
      response,
    );

    expect(sendMatchPush).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, deduped: false }),
    );
  });
});
