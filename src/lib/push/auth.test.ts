import { describe, expect, it } from "vitest";

import { deriveChannelAuthToken } from "./auth";

describe("deriveChannelAuthToken", () => {
  it("derives a stable token for the same mnemonic", async () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    const tokenA = await deriveChannelAuthToken(mnemonic);
    const tokenB = await deriveChannelAuthToken(mnemonic);

    expect(tokenA).toBe(tokenB);
    expect(tokenA).not.toBe(mnemonic);
    expect(tokenA.length).toBeGreaterThan(20);
  });

  it("produces different tokens for different mnemonics", async () => {
    const tokenA = await deriveChannelAuthToken(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );
    const tokenB = await deriveChannelAuthToken(
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
    );

    expect(tokenA).not.toBe(tokenB);
  });
});
