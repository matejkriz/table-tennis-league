import { describe, expect, it } from "vitest";

import {
  canAccessStartRoute,
  isStartupState,
  shouldRedirectRootToStart,
} from "./startAccess";

describe("startAccess", () => {
  it("treats zero matches and zero players as startup state", () => {
    expect(
      isStartupState({
        matchCount: 0,
        playerCount: 0,
      })
    ).toBe(true);
  });

  it("treats zero matches and one player as startup state", () => {
    expect(
      isStartupState({
        matchCount: 0,
        playerCount: 1,
      })
    ).toBe(true);
  });

  it("treats zero matches and two players as non-startup state", () => {
    expect(
      isStartupState({
        matchCount: 0,
        playerCount: 2,
      })
    ).toBe(false);
  });

  it("allows start route whenever share param exists", () => {
    expect(
      canAccessStartRoute({
        hasShareParam: true,
        matchCount: 4,
        playerCount: 5,
      })
    ).toBe(true);
  });

  it("redirects / to /start only for startup state", () => {
    expect(
      shouldRedirectRootToStart({
        matchCount: 0,
        playerCount: 1,
      })
    ).toBe(true);
    expect(
      shouldRedirectRootToStart({
        matchCount: 0,
        playerCount: 2,
      })
    ).toBe(false);
  });

  it("still treats the app as startup state when all historical players are deleted and no active players remain", () => {
    expect(
      shouldRedirectRootToStart({
        matchCount: 0,
        playerCount: 0,
      })
    ).toBe(true);
  });
});
