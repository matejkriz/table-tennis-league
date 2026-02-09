import type { VercelRequest, VercelResponse } from "@vercel/node";

import { allowMethod, isNonEmptyString, readJsonBody } from "../_lib/http.js";
import { verifyChannelAuth } from "../_lib/pushAuth.js";
import { removeSubscription } from "../_lib/pushStore.js";
import type { PushUnsubscribeRequest } from "../_lib/pushTypes.js";

const isValidRequest = (
  body: PushUnsubscribeRequest | null,
): body is PushUnsubscribeRequest => {
  if (!body) return false;

  return (
    isNonEmptyString(body.channelId) &&
    isNonEmptyString(body.authToken) &&
    !!body.subscription &&
    isNonEmptyString(body.subscription.endpoint)
  );
};

export const handler = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> => {
  if (!allowMethod(request, response, "POST")) return;

  const body = readJsonBody<PushUnsubscribeRequest>(request);
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

  await removeSubscription(body.channelId, body.subscription.endpoint);

  response.status(200).json({ ok: true });
};

export default handler;
