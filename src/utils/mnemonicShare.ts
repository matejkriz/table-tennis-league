import { err, ok, type Result } from "@evolu/common";
import { deflateSync, inflateSync } from "fflate";

const SHARE_TOKEN_VERSION = 1;
const SHARE_TOKEN_MIN_LENGTH = 30 + 16; // header + minimum AES-GCM auth tag
const SHARE_TOKEN_COMPRESSED_FLAG = 1;
const PBKDF2_ITERATIONS = 250_000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

interface InvalidLeagueNameError {
  readonly type: "InvalidLeagueName";
}

interface ShareEncryptionFailedError {
  readonly type: "ShareEncryptionFailed";
}

interface InvalidTokenError {
  readonly type: "InvalidToken";
}

interface UnsupportedVersionError {
  readonly type: "UnsupportedVersion";
  readonly version: number;
}

interface DecryptionFailedError {
  readonly type: "DecryptionFailed";
}

interface DecompressionFailedError {
  readonly type: "DecompressionFailed";
}

export type ShareEncodeError = InvalidLeagueNameError | ShareEncryptionFailedError;

export type ShareDecodeError =
  | InvalidLeagueNameError
  | InvalidTokenError
  | UnsupportedVersionError
  | DecryptionFailedError
  | DecompressionFailedError;

interface EncodeMnemonicShareTokenInput {
  readonly mnemonic: string;
  readonly leagueName: string;
}

interface DecodeMnemonicShareTokenInput {
  readonly token: string;
  readonly leagueName: string;
}

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string): Result<Uint8Array, InvalidTokenError> => {
  if (!/^[A-Za-z0-9\-_]+$/.test(value)) {
    return err({ type: "InvalidToken" });
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return ok(bytes);
  } catch {
    return err({ type: "InvalidToken" });
  }
};

const deriveKey = async (
  normalizedLeagueName: string,
  salt: Uint8Array<ArrayBufferLike>
): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(normalizedLeagueName),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const encodePayload = (payload: Uint8Array): { readonly bytes: Uint8Array; readonly compressed: boolean } => {
  const compressed = deflateSync(payload);

  if (compressed.length < payload.length) {
    return {
      bytes: compressed,
      compressed: true,
    };
  }

  return {
    bytes: payload,
    compressed: false,
  };
};

export const normalizeLeagueName = (value: string): string =>
  value.trim().toLowerCase();

export const encodeMnemonicShareToken = async (
  input: EncodeMnemonicShareTokenInput
): Promise<Result<string, ShareEncodeError>> => {
  const normalizedLeagueName = normalizeLeagueName(input.leagueName);

  if (normalizedLeagueName.length === 0) {
    return err({ type: "InvalidLeagueName" });
  }

  try {
    const payload = textEncoder.encode(input.mnemonic);
    const encodedPayload = encodePayload(payload);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(normalizedLeagueName, salt);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedPayload.bytes as Uint8Array<ArrayBuffer>
    );
    const encrypted = new Uint8Array(encryptedBuffer);
    const output = new Uint8Array(30 + encrypted.length);

    output[0] = SHARE_TOKEN_VERSION;
    output[1] = encodedPayload.compressed ? SHARE_TOKEN_COMPRESSED_FLAG : 0;
    output.set(salt, 2);
    output.set(iv, 18);
    output.set(encrypted, 30);

    return ok(toBase64Url(output));
  } catch {
    return err({ type: "ShareEncryptionFailed" });
  }
};

export const decodeMnemonicShareToken = async (
  input: DecodeMnemonicShareTokenInput
): Promise<Result<string, ShareDecodeError>> => {
  const normalizedLeagueName = normalizeLeagueName(input.leagueName);

  if (normalizedLeagueName.length === 0) {
    return err({ type: "InvalidLeagueName" });
  }

  const tokenBytesResult = fromBase64Url(input.token);
  if (!tokenBytesResult.ok) return tokenBytesResult;

  const tokenBytes = tokenBytesResult.value;
  if (tokenBytes.length < SHARE_TOKEN_MIN_LENGTH) {
    return err({ type: "InvalidToken" });
  }

  const version = tokenBytes[0];
  if (version !== SHARE_TOKEN_VERSION) {
    return err({ type: "UnsupportedVersion", version });
  }

  const flags = tokenBytes[1];
  const isCompressed = (flags & SHARE_TOKEN_COMPRESSED_FLAG) === SHARE_TOKEN_COMPRESSED_FLAG;
  const salt = tokenBytes.slice(2, 18);
  const iv = tokenBytes.slice(18, 30);
  const ciphertext = tokenBytes.slice(30);

  try {
    const key = await deriveKey(normalizedLeagueName, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext as Uint8Array<ArrayBuffer>
    );
    let payload: Uint8Array<ArrayBufferLike> = new Uint8Array(decryptedBuffer);

    if (isCompressed) {
      try {
        payload = inflateSync(payload);
      } catch {
        return err({ type: "DecompressionFailed" });
      }
    }

    return ok(textDecoder.decode(payload as Uint8Array<ArrayBuffer>));
  } catch {
    return err({ type: "DecryptionFailed" });
  }
};

export const buildShareUrl = (token: string): string => {
  const shareUrl = new URL("/start", window.location.origin);
  shareUrl.searchParams.set("share", token);
  return shareUrl.toString();
};
