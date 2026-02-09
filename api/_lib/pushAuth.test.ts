import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashAuthToken, verifyChannelAuth } from "./pushAuth";

vi.mock("./pushStore", () => ({
  getChannelTokenHash: vi.fn(),
  setChannelTokenHash: vi.fn(),
}));

import { getChannelTokenHash, setChannelTokenHash } from "./pushStore";

const mockGet = vi.mocked(getChannelTokenHash);
const mockSet = vi.mocked(setChannelTokenHash);

const makeInput = (overrides?: Partial<Parameters<typeof verifyChannelAuth>[0]>) => ({
  channelId: "channel-1",
  authToken: "token-123",
  allowBootstrap: false,
  ...overrides,
});

describe("verifyChannelAuth", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("bootstraps when no existing token and allowBootstrap=true", async () => {
    mockGet.mockResolvedValueOnce(null);

    const result = await verifyChannelAuth(
      makeInput({ allowBootstrap: true }),
    );

    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("rejects when no existing token and allowBootstrap=false", async () => {
    mockGet.mockResolvedValueOnce(null);

    const result = await verifyChannelAuth(makeInput());

    expect(result).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("accepts when token matches stored hash", async () => {
    const authToken = "token-123";
    mockGet.mockResolvedValueOnce(hashAuthToken(authToken));

    const result = await verifyChannelAuth(
      makeInput({ authToken }),
    );

    expect(result).toBe(true);
  });

  it("rejects when token hash does not match", async () => {
    mockGet.mockResolvedValueOnce(
      "a0c1c2ee6e59681057305f4f3bdf45685d7117cbfadc5de3d9a5bcae8a17fdcc",
    );

    const result = await verifyChannelAuth(
      makeInput({ authToken: "token-123" }),
    );

    expect(result).toBe(false);
  });
});
