import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendNotification = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

import { sendMatchPush } from "./pushSend";
import type { MatchPushPayload, PushSubscriptionRecord } from "./pushTypes";

const dummyPayload: MatchPushPayload = {
  type: "match-played",
  title: "League",
  body: "Alice defeated Bob!",
  data: { eventId: "evt-1", url: "/" },
};

const payloadFactory = () => dummyPayload;

const makeSub = (
  deviceId: string,
  endpoint = `https://push.example.com/${deviceId}`,
): PushSubscriptionRecord => ({
  endpoint,
  deviceId,
  locale: "en",
  updatedAt: "2026-02-14T00:00:00.000Z",
  subscription: { endpoint },
});

describe("sendMatchPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendNotification.mockResolvedValue(undefined);

    process.env.VAPID_PUBLIC_KEY = "test-public";
    process.env.VAPID_PRIVATE_KEY = "test-private";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
  });

  it("skips sender when multiple devices are subscribed", async () => {
    const result = await sendMatchPush({
      subscriptions: [makeSub("sender"), makeSub("other")],
      senderDeviceId: "sender",
      payloadFactory,
    });

    expect(result.totalSubscriptions).toBe(2);
    expect(result.skippedSender).toBe(1);
    expect(result.attempted).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("sends to sender when it is the only subscriber", async () => {
    const result = await sendMatchPush({
      subscriptions: [makeSub("sender")],
      senderDeviceId: "sender",
      payloadFactory,
    });

    expect(result.totalSubscriptions).toBe(1);
    expect(result.skippedSender).toBe(0);
    expect(result.attempted).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("handles empty subscriptions", async () => {
    const result = await sendMatchPush({
      subscriptions: [],
      senderDeviceId: "sender",
      payloadFactory,
    });

    expect(result.totalSubscriptions).toBe(0);
    expect(result.attempted).toBe(0);
    expect(result.sent).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("marks stale endpoints on 410 error", async () => {
    mockSendNotification.mockRejectedValueOnce({ statusCode: 410 });

    const result = await sendMatchPush({
      subscriptions: [makeSub("other")],
      senderDeviceId: "sender",
      payloadFactory,
    });

    expect(result.failed).toBe(1);
    expect(result.staleEndpoints).toEqual(["https://push.example.com/other"]);
  });

  it("deduplicates subscriptions keeping latest per device", async () => {
    const older: PushSubscriptionRecord = {
      ...makeSub("device-a", "https://push.example.com/old"),
      updatedAt: "2026-02-13T00:00:00.000Z",
    };
    const newer: PushSubscriptionRecord = {
      ...makeSub("device-a", "https://push.example.com/new"),
      updatedAt: "2026-02-14T00:00:00.000Z",
    };

    const result = await sendMatchPush({
      subscriptions: [older, newer],
      senderDeviceId: "sender",
      payloadFactory,
    });

    expect(result.totalSubscriptions).toBe(1);
    expect(result.attempted).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/new" },
      expect.any(String),
    );
  });
});
