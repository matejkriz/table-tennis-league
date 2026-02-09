import type { VercelRequest, VercelResponse } from "@vercel/node";

import { allowMethod, isNonEmptyString, readJsonBody } from "../_lib/http.js";
import { verifyChannelAuth } from "../_lib/pushAuth.js";
import {
  listSubscriptions,
  markEventIfNew,
  removeSubscription,
} from "../_lib/pushStore.js";
import { sendMatchPush } from "../_lib/pushSend.js";
import type {
  MatchPushPayload,
  PushNotifyMatchRequest,
} from "../_lib/pushTypes.js";

const isValidRequest = (
  body: PushNotifyMatchRequest | null,
): body is PushNotifyMatchRequest => {
  if (!body) return false;

  return (
    isNonEmptyString(body.channelId) &&
    isNonEmptyString(body.authToken) &&
    isNonEmptyString(body.senderDeviceId) &&
    isNonEmptyString(body.locale) &&
    isNonEmptyString(body.eventId) &&
    isNonEmptyString(body.playedAt) &&
    isNonEmptyString(body.playerAName) &&
    isNonEmptyString(body.playerBName) &&
    isNonEmptyString(body.winnerName) &&
    // Validate winnerName matches one of the players (exact match)
    (body.winnerName === body.playerAName || body.winnerName === body.playerBName)
  );
};

const createPayload = (body: PushNotifyMatchRequest): MatchPushPayload => {
  const loserName =
    body.winnerName === body.playerAName ? body.playerBName : body.playerAName;

  return {
    type: "match-played",
    title: "Table Tennis League",
    body: `${body.winnerName} defeated ${loserName}.`,
    data: {
      eventId: body.eventId,
      url: "/",
    },
  };
};

export const handler = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> => {
  if (!allowMethod(request, response, "POST")) return;

  const body = readJsonBody<PushNotifyMatchRequest>(request);
  if (!isValidRequest(body)) {
    response.status(400).json({ ok: false, error: "InvalidBody" });
    return;
  }

  const authorized = await verifyChannelAuth({
    channelId: body.channelId,
    authToken: body.authToken,
    allowBootstrap: false,
  });

  if (!authorized) {
    response.status(401).json({ ok: false, error: "UnauthorizedChannel" });
    return;
  }

  const isNewEvent = await markEventIfNew(body.channelId, body.eventId);
  if (!isNewEvent) {
    response.status(200).json({ ok: true, deduped: true, attempted: 0, sent: 0 });
    return;
  }

  const subscriptions = await listSubscriptions(body.channelId);

  const result = await sendMatchPush({
    subscriptions,
    senderDeviceId: body.senderDeviceId,
    payload: createPayload(body),
  });

  await Promise.allSettled(
    result.staleEndpoints.map((endpoint) =>
      removeSubscription(body.channelId, endpoint),
    ),
  );

  response.status(200).json({
    ok: true,
    deduped: false,
    attempted: result.attempted,
    sent: result.sent,
    failed: result.failed,
  });
};

export default handler;
