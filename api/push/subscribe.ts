import type { VercelRequest, VercelResponse } from "@vercel/node";

import { allowMethod, isNonEmptyString, readJsonBody } from "../_lib/http.js";
import { verifyChannelAuth } from "../_lib/pushAuth.js";
import { countSubscriptions, upsertSubscription } from "../_lib/pushStore.js";
import type { PushSubscribeRequest } from "../_lib/pushTypes.js";

const isValidRequest = (
  body: PushSubscribeRequest | null,
): body is PushSubscribeRequest => {
  if (!body) return false;

  return (
    isNonEmptyString(body.channelId) &&
    isNonEmptyString(body.authToken) &&
    isNonEmptyString(body.deviceId) &&
    isNonEmptyString(body.locale) &&
    !!body.subscription &&
    isNonEmptyString(body.subscription.endpoint)
  );
};

export const handler = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> => {
  if (!allowMethod(request, response, "POST")) return;

  const body = readJsonBody<PushSubscribeRequest>(request);
  if (!isValidRequest(body)) {
    response.status(400).json({ ok: false, error: "InvalidBody" });
    return;
  }

  const authorized = await verifyChannelAuth({
    channelId: body.channelId,
    authToken: body.authToken,
    allowBootstrap: true,
  });

  if (!authorized) {
    response.status(401).json({ ok: false, error: "UnauthorizedChannel" });
    return;
  }

  await upsertSubscription(body.channelId, {
    endpoint: body.subscription.endpoint,
    deviceId: body.deviceId,
    locale: body.locale,
    updatedAt: new Date().toISOString(),
    subscription: body.subscription,
  });

  const subscriptionCount = await countSubscriptions(body.channelId);
  response.status(200).json({ ok: true, subscriptionCount });
};

export default handler;
