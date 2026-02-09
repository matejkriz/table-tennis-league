import { createHash, timingSafeEqual } from "node:crypto";

import { getChannelTokenHash, setChannelTokenHash } from "./pushStore.js";

export const hashAuthToken = (authToken: string): string =>
  createHash("sha256").update(authToken).digest("hex");

const safeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
};

export const verifyChannelAuth = async ({
  channelId,
  authToken,
  allowBootstrap,
}: {
  readonly channelId: string;
  readonly authToken: string;
  readonly allowBootstrap: boolean;
}): Promise<boolean> => {
  const tokenHash = hashAuthToken(authToken);
  const existing = await getChannelTokenHash(channelId);

  if (!existing) {
    if (!allowBootstrap) return false;
    await setChannelTokenHash(channelId, tokenHash);
    return true;
  }

  return safeEqual(existing, tokenHash);
};
