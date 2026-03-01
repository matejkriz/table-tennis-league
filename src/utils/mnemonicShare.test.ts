import { describe, expect, it } from "vitest";

import {
  buildShareUrl,
  decodeMnemonicShareToken,
  encodeMnemonicShareToken,
  normalizeLeagueName,
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
  it("normalizes league name by trimming and lowercasing", () => {
    expect(normalizeLeagueName("  My League  ")).toBe("my league");
  });

  it("encodes and decodes mnemonic with normalized league-name parity", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      leagueName: " My League ",
    });

    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const decoded = await decodeMnemonicShareToken({
      token: encoded.value,
      leagueName: "my league",
    });

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value).toBe(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
  });

  it("fails decryption with wrong league name", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      leagueName: "league one",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const decoded = await decodeMnemonicShareToken({
      token: encoded.value,
      leagueName: "league two",
    });

    expect(decoded.ok).toBe(false);
    if (decoded.ok) return;
    expect(decoded.error.type).toBe("DecryptionFailed");
  });

  it("fails for malformed token", async () => {
    const decoded = await decodeMnemonicShareToken({
      token: "not-a-valid-token",
      leagueName: "league",
    });

    expect(decoded.ok).toBe(false);
    if (decoded.ok) return;
    expect(decoded.error.type).toBe("InvalidToken");
  });

  it("fails for unsupported version", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      leagueName: "league",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const payload = decodeBase64Url(encoded.value);
    payload[0] = 0xff;

    const decoded = await decodeMnemonicShareToken({
      token: encodeBase64Url(payload),
      leagueName: "league",
    });

    expect(decoded.ok).toBe(false);
    if (decoded.ok) return;
    expect(decoded.error.type).toBe("UnsupportedVersion");
  });

  it("sets compressed flag for repetitive payload", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      leagueName: "league",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const payload = decodeBase64Url(encoded.value);
    expect(payload[1] & 1).toBe(1);
  });

  it("does not set compressed flag when compression is not smaller", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic: "abc",
      leagueName: "league",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const payload = decodeBase64Url(encoded.value);
    expect(payload[1] & 1).toBe(0);
  });

  it("builds share URLs targeting /start", () => {
    const shareUrl = buildShareUrl("abc123");
    expect(shareUrl).toContain("/start?share=abc123");
  });
});
