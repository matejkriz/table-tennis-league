import { describe, expect, it } from "vitest";
import {
  decrypt,
  DecryptionFailed,
  encrypt,
  EncryptionUnavailable,
} from "./encryption";

describe("encryption", () => {
  // A valid 128-bit hex key (32 hex characters = 16 bytes = 128 bits)
  const validKey = "0123456789abcdef0123456789abcdef";

  describe("encrypt", () => {
    it("should encrypt a string value successfully", async () => {
      const result = await encrypt({ value: "hello world", encryptionKey: validKey });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Result should be a hex string
        expect(typeof result.value).toBe("string");
        expect(result.value).toMatch(/^[0-9a-f]+$/);
        // Should be long enough to contain IV (12 bytes) + some ciphertext + auth tag (16 bytes)
        expect(result.value.length).toBeGreaterThan((12 + 16) * 2);
      }
    });

    it("should return different ciphertexts for the same plaintext (due to random IV)", async () => {
      const result1 = await encrypt({
        value: "same text",
        encryptionKey: validKey,
      });
      const result2 = await encrypt({
        value: "same text",
        encryptionKey: validKey,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value).not.toBe(result2.value);
      }
    });

    it("should return error when encryption key is null", async () => {
      const result = await encrypt({
        value: "hello",
        encryptionKey: null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("EncryptionUnavailable");
        expect(result.error.message).toBe("Encryption key not available");
      }
    });

    it("should handle empty string value", async () => {
      const result = await encrypt({ value: "", encryptionKey: validKey });

      expect(result.ok).toBe(true);
    });

    it("should handle unicode characters", async () => {
      const result = await encrypt({
        value: "Hello 你好 مرحبا 🎉",
        encryptionKey: validKey,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe("decrypt", () => {
    it("should decrypt an encrypted value back to the original", async () => {
      const originalValue = "hello world";
      const encryptResult = await encrypt({
        value: originalValue,
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(true);
        if (decryptResult.ok) {
          expect(decryptResult.value).toBe(originalValue);
        }
      }
    });

    it("should decrypt unicode characters correctly", async () => {
      const originalValue = "Hello 你好 مرحبا 🎉";
      const encryptResult = await encrypt({
        value: originalValue,
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(true);
        if (decryptResult.ok) {
          expect(decryptResult.value).toBe(originalValue);
        }
      }
    });

    it("should decrypt empty string correctly", async () => {
      const encryptResult = await encrypt({ value: "", encryptionKey: validKey });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(true);
        if (decryptResult.ok) {
          expect(decryptResult.value).toBe("");
        }
      }
    });

    it("should return error when encryption key is null", async () => {
      const result = await decrypt({
        value: "someencryptedvalue",
        encryptionKey: null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("EncryptionUnavailable");
        if (result.error.type === "EncryptionUnavailable") {
          expect(result.error.message).toBe("Encryption key not available");
        }
      }
    });

    it("should return DecryptionFailed for invalid ciphertext", async () => {
      const result = await decrypt({
        value: "0011223344556677889900112233445566778899001122334455667788990011",
        encryptionKey: validKey,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("DecryptionFailed");
      }
    });

    it("should return DecryptionFailed for tampered ciphertext", async () => {
      const encryptResult = await encrypt({
        value: "secret message",
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        // Tamper with the ciphertext by modifying some bytes in the middle
        const tampered =
          encryptResult.value.substring(0, 40) +
          "ff" +
          encryptResult.value.substring(42);
        const decryptResult = await decrypt({
          value: tampered,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(false);
        if (!decryptResult.ok) {
          expect(decryptResult.error.type).toBe("DecryptionFailed");
        }
      }
    });

    it("should return DecryptionFailed when using wrong key", async () => {
      const wrongKey = "fedcba9876543210fedcba9876543210";

      const encryptResult = await encrypt({
        value: "secret message",
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: wrongKey,
        });

        expect(decryptResult.ok).toBe(false);
        if (!decryptResult.ok) {
          expect(decryptResult.error.type).toBe("DecryptionFailed");
        }
      }
    });
  });

  describe("error types", () => {
    it("should create EncryptionUnavailable error correctly", () => {
      const error = EncryptionUnavailable("test message");
      expect(error.type).toBe("EncryptionUnavailable");
      expect(error.message).toBe("test message");
    });

    it("should create DecryptionFailed error correctly", () => {
      const error = DecryptionFailed();
      expect(error.type).toBe("DecryptionFailed");
    });
  });

  describe("round-trip encryption", () => {
    it("should handle long text", async () => {
      const longText = "a".repeat(10000);
      const encryptResult = await encrypt({
        value: longText,
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(true);
        if (decryptResult.ok) {
          expect(decryptResult.value).toBe(longText);
        }
      }
    });

    it("should handle special characters", async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~\n\t\r';
      const encryptResult = await encrypt({
        value: specialChars,
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(true);
        if (decryptResult.ok) {
          expect(decryptResult.value).toBe(specialChars);
        }
      }
    });

    it("should handle JSON data", async () => {
      const jsonData = JSON.stringify({
        name: "Test",
        value: 123,
        nested: { array: [1, 2, 3] },
      });
      const encryptResult = await encrypt({
        value: jsonData,
        encryptionKey: validKey,
      });

      expect(encryptResult.ok).toBe(true);
      if (encryptResult.ok) {
        const decryptResult = await decrypt({
          value: encryptResult.value,
          encryptionKey: validKey,
        });

        expect(decryptResult.ok).toBe(true);
        if (decryptResult.ok) {
          expect(JSON.parse(decryptResult.value)).toEqual(JSON.parse(jsonData));
        }
      }
    });
  });
});
