import { describe, expect, it } from "vitest";

import {
  buildShareUrl,
  extractShareTokenFromShareUrl,
  decodeMnemonicShareToken,
  encodeMnemonicShareToken,
} from "./mnemonicShare";

const decodeBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

describe("mnemonicShare", () => {
  it("encodes and decodes mnemonic", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });

    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const decoded = await decodeMnemonicShareToken({
      token: encoded.value,
    });

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value).toBe(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
  });

  it("returns the same token for the same mnemonic", async () => {
    const input = {
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    };

    const encodedA = await encodeMnemonicShareToken(input);
    const encodedB = await encodeMnemonicShareToken(input);

    expect(encodedA).toEqual(encodedB);
  });

  it("returns different tokens for different mnemonics", async () => {
    const encodedA = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    const encodedB = await encodeMnemonicShareToken({
      mnemonic:
        "legal winner thank year wave sausage worth useful legal winner thank yellow",
    });

    expect(encodedA.ok).toBe(true);
    expect(encodedB.ok).toBe(true);
    if (!encodedA.ok || !encodedB.ok) return;

    expect(encodedA.value).not.toBe(encodedB.value);
  });

  it("fails for malformed token", async () => {
    const decoded = await decodeMnemonicShareToken({
      token: "not-a-valid-token",
    });

    expect(decoded.ok).toBe(false);
    if (decoded.ok) return;
    expect(decoded.error.type).toBe("InvalidToken");
  });

  it("fails for unsupported version", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const payload = decodeBase64Url(encoded.value);
    payload[0] = 1;

    const decoded = await decodeMnemonicShareToken({
      token: encodeBase64Url(payload),
    });

    expect(decoded.ok).toBe(false);
    if (decoded.ok) return;
    expect(decoded.error.type).toBe("UnsupportedVersion");
  });

  it("sets compressed flag for repetitive payload", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const payload = decodeBase64Url(encoded.value);
    expect(payload[1] & 1).toBe(1);
  });

  it("does not set compressed flag when compression is not smaller", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic: "abc",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const payload = decodeBase64Url(encoded.value);
    expect(payload[1] & 1).toBe(0);
  });

  it("extracts share token from a share URL", () => {
    const shareTokenResult = extractShareTokenFromShareUrl(
      "https://example.com/start?share=abc123"
    );

    expect(shareTokenResult).toEqual({ ok: true, value: "abc123" });
  });

  it("fails when the scanned URL does not contain a share token", () => {
    const shareTokenResult = extractShareTokenFromShareUrl(
      "https://example.com/start"
    );

    expect(shareTokenResult.ok).toBe(false);
    if (shareTokenResult.ok) return;
    expect(shareTokenResult.error.type).toBe("InvalidShareUrl");
  });

  it("builds share URLs targeting /start", () => {
    const shareUrl = buildShareUrl("abc123");
    expect(shareUrl).toContain("/start?share=abc123");
  });
});
