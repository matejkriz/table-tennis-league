import { err, ok, type Result } from "@evolu/common";
import { deflateSync, inflateSync } from "fflate";

const SHARE_TOKEN_VERSION = 2;
const SHARE_TOKEN_MIN_LENGTH = 14 + 16; // header + minimum AES-GCM auth tag
const SHARE_TOKEN_COMPRESSED_FLAG = 1;
const IV_SIZE = 12;
const QR_SHARE_SECRET = "qr-share-secret-7f5m2k9q1x8v4n6p3r0s2t7u9w1y4z6";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

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

interface InvalidShareUrlError {
  readonly type: "InvalidShareUrl";
}

export type ShareEncodeError = ShareEncryptionFailedError;

export type ShareDecodeError =
  | InvalidTokenError
  | UnsupportedVersionError
  | DecryptionFailedError
  | DecompressionFailedError;

export type ShareUrlDecodeError = InvalidShareUrlError;

interface EncodeMnemonicShareTokenInput {
  readonly mnemonic: string;
}

interface DecodeMnemonicShareTokenInput {
  readonly token: string;
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

let shareKeyPromise: Promise<CryptoKey> | null = null;

const getShareKey = async (): Promise<CryptoKey> => {
  if (shareKeyPromise) {
    return shareKeyPromise;
  }

  shareKeyPromise = crypto.subtle
    .digest("SHA-256", textEncoder.encode(QR_SHARE_SECRET))
    .then((hashBuffer) =>
      crypto.subtle.importKey(
        "raw",
        hashBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      )
    );

  return shareKeyPromise;
};

const deriveDeterministicIv = async (
  mnemonic: string
): Promise<Uint8Array<ArrayBuffer>> => {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(`qr-share:v2:${mnemonic}`)
  );

  return new Uint8Array(hashBuffer).slice(0, IV_SIZE) as Uint8Array<ArrayBuffer>;
};

const encodePayload = (
  payload: Uint8Array
): { readonly bytes: Uint8Array; readonly compressed: boolean } => {
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

export const encodeMnemonicShareToken = async (
  input: EncodeMnemonicShareTokenInput
): Promise<Result<string, ShareEncodeError>> => {
  try {
    const payload = textEncoder.encode(input.mnemonic);
    const encodedPayload = encodePayload(payload);
    const iv = await deriveDeterministicIv(input.mnemonic);
    const key = await getShareKey();

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedPayload.bytes as Uint8Array<ArrayBuffer>
    );
    const encrypted = new Uint8Array(encryptedBuffer);
    const output = new Uint8Array(14 + encrypted.length);

    output[0] = SHARE_TOKEN_VERSION;
    output[1] = encodedPayload.compressed ? SHARE_TOKEN_COMPRESSED_FLAG : 0;
    output.set(iv, 2);
    output.set(encrypted, 14);

    return ok(toBase64Url(output));
  } catch {
    return err({ type: "ShareEncryptionFailed" });
  }
};

export const decodeMnemonicShareToken = async (
  input: DecodeMnemonicShareTokenInput
): Promise<Result<string, ShareDecodeError>> => {
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
  const iv = tokenBytes.slice(2, 14);
  const ciphertext = tokenBytes.slice(14);

  try {
    const key = await getShareKey();
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

export const extractShareTokenFromShareUrl = (
  value: string
): Result<string, ShareUrlDecodeError> => {
  try {
    const parsedUrl = new URL(value, window.location.origin);
    const shareToken = parsedUrl.searchParams.get("share");

    if (
      shareToken == null ||
      shareToken.length === 0 ||
      !["http:", "https:"].includes(parsedUrl.protocol)
    ) {
      return err({ type: "InvalidShareUrl" });
    }

    return ok(shareToken);
  } catch {
    return err({ type: "InvalidShareUrl" });
  }
};

export const buildShareUrl = (token: string): string => {
  const shareUrl = new URL("/start", window.location.origin);
  shareUrl.searchParams.set("share", token);
  return shareUrl.toString();
};
