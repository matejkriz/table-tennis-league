import { describe, expect, it } from "vitest";

import { getDefaultPushPayload, parsePushPayload } from "./sw";

describe("parsePushPayload", () => {
  it("falls back to default payload for invalid values", () => {
    const payload = parsePushPayload(null);

    expect(payload).toEqual(getDefaultPushPayload());
  });

  it("accepts a valid push payload", () => {
    const payload = parsePushPayload({
      type: "match-played",
      title: "Table Tennis League",
      body: "Alice defeated Bob.",
      data: {
        eventId: "evt-1",
        url: "/",
      },
    });

    expect(payload.data.eventId).toBe("evt-1");
    expect(payload.body).toContain("Alice");
  });
});
