import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlayerId } from "../evolu/client";
import type { MatchSummary } from "../hooks/useLeagueData";
import { createMockPlayer } from "../test/helpers";
import { MatchHistory } from "./MatchHistory";

vi.mock("../evolu/client", () => ({
  useEvolu: vi.fn(() => ({ update: vi.fn() })),
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
}));

describe("MatchHistory", () => {
  it("scrolls to the requested match row when scrollToMatchId is provided", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const alice = createMockPlayer({
      id: "p1" as PlayerId,
      name: "Alice",
      initialRating: 1000,
    });
    const bob = createMockPlayer({
      id: "p2" as PlayerId,
      name: "Bob",
      initialRating: 1000,
    });

    const matches = [
      {
        match: {
          id: "m1",
          playedAt: "2026-03-01T10:00:00.000Z",
          note: null,
        },
        isDoubles: false,
        winnerTeam: "A",
        teamAPlayers: [alice],
        teamBPlayers: [bob],
        participants: [
          {
            player: alice,
            team: "A",
            ratingBefore: 1000,
            ratingAfter: 1008,
            delta: 8,
          },
          {
            player: bob,
            team: "B",
            ratingBefore: 1000,
            ratingAfter: 992,
            delta: -8,
          },
        ],
        players: { a: alice, b: bob },
        ratingBefore: { a: 1000, b: 1000 },
        ratingAfter: { a: 1008, b: 992 },
        delta: { a: 8, b: -8 },
      },
    ] as unknown as MatchSummary[];

    render(<MatchHistory matches={matches} scrollToMatchId="m1" />);

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });
  });
});
