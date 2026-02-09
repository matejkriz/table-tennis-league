import type { MatchPushPayload } from "./types";

const DEFAULT_PUSH_PAYLOAD: MatchPushPayload = {
  type: "match-played",
  title: "Table Tennis League",
  body: "A new match was recorded.",
  data: {
    eventId: "unknown",
    url: "/",
  },
};

export const getDefaultPushPayload = (): MatchPushPayload => DEFAULT_PUSH_PAYLOAD;

export const parsePushPayload = (value: unknown): MatchPushPayload => {
  if (!value || typeof value !== "object") return DEFAULT_PUSH_PAYLOAD;

  const payload = value as Partial<MatchPushPayload>;
  if (
    payload.type !== "match-played" ||
    typeof payload.title !== "string" ||
    typeof payload.body !== "string" ||
    !payload.data ||
    typeof payload.data.url !== "string" ||
    typeof payload.data.eventId !== "string"
  ) {
    return DEFAULT_PUSH_PAYLOAD;
  }

  return {
    type: "match-played",
    title: payload.title,
    body: payload.body,
    data: {
      url: payload.data.url,
      eventId: payload.data.eventId,
    },
  };
};
