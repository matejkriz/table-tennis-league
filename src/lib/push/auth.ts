const AUTH_PREFIX = "ttl-push-v1:";

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * Derives a deterministic push channel token from the owner's mnemonic.
 */
export const deriveChannelAuthToken = async (mnemonic: string): Promise<string> => {
  const input = `${AUTH_PREFIX}${mnemonic.trim()}`;
  const digestBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );

  return toHex(new Uint8Array(digestBuffer));
};
