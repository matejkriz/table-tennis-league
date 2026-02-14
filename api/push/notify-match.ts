import type { VercelRequest, VercelResponse } from "@vercel/node";

import { allowMethod, isNonEmptyString, readJsonBody } from "../_lib/http.js";
import { verifyChannelAuth } from "../_lib/pushAuth.js";
import {
  clearEventMark,
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
    typeof body.playerARating === "number" &&
    typeof body.playerBRating === "number" &&
    typeof body.playerARank === "number" &&
    typeof body.playerBRank === "number" &&
    body.playerARank >= 1 &&
    body.playerBRank >= 1 &&
    // Validate winnerName matches one of the players (exact match)
    (body.winnerName === body.playerAName || body.winnerName === body.playerBName)
  );
};

const translate = (key: string, locale: string): string => {
  const translations: Record<string, Record<string, string>> = {
    "Satoshi's League": { en: "Satoshi's League", cs: "Satoshiho liga" },
    defeated: { en: "defeated", cs: "vítězí nad" },
  };

  const localeTranslations = translations[key];
  if (!localeTranslations) return key;

  return localeTranslations[locale] ?? localeTranslations.en ?? key;
};

const createPayload = (
  body: PushNotifyMatchRequest,
  locale: string,
): MatchPushPayload => {
  const isPlayerAWinner = body.winnerName === body.playerAName;
  const winnerName = isPlayerAWinner ? body.playerAName : body.playerBName;
  const loserName = isPlayerAWinner ? body.playerBName : body.playerAName;
  const winnerRating = isPlayerAWinner ? body.playerARating : body.playerBRating;
  const loserRating = isPlayerAWinner ? body.playerBRating : body.playerARating;
  const winnerRank = isPlayerAWinner ? body.playerARank : body.playerBRank;
  const loserRank = isPlayerAWinner ? body.playerBRank : body.playerARank;

  const title = translate("Satoshi's League", locale);
  const defeatedText = translate("defeated", locale);

  return {
    type: "match-played",
    title,
    body: `#${winnerRank} ${winnerName} (${winnerRating}) ${defeatedText} #${loserRank} ${loserName} (${loserRating})!`,
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
    response.status(200).json({
      ok: true,
      deduped: true,
      totalSubscriptions: 0,
      skippedSender: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
    });
    return;
  }

  let result;
  try {
    const subscriptions = await listSubscriptions(body.channelId);

    result = await sendMatchPush({
      subscriptions,
      senderDeviceId: body.senderDeviceId,
      payloadFactory: (locale: string) => createPayload(body, locale),
    });
  } catch (error) {
    // Delivery failed — clear the dedupe mark so retries are not lost.
    await clearEventMark(body.channelId, body.eventId);
    throw error;
  }

  await Promise.allSettled(
    result.staleEndpoints.map((endpoint) =>
      removeSubscription(body.channelId, endpoint),
    ),
  );

  response.status(200).json({
    ok: true,
    deduped: false,
    totalSubscriptions: result.totalSubscriptions,
    skippedSender: result.skippedSender,
    attempted: result.attempted,
    sent: result.sent,
    failed: result.failed,
  });
};

export default handler;
