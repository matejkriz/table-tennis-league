import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../evolu/client", () => ({
  useEvolu: () => ({
    update: vi.fn(() => ({ ok: true })),
  }),
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
}));

import type { MatchSummary } from "../hooks/useLeagueData";
import { createMockMatch, createMockPlayer } from "../test/helpers";
import { MatchHistory } from "./MatchHistory";

const alice = createMockPlayer({
  id: "player1",
  name: "Alice",
  initialRating: 1000,
});

const bob = createMockPlayer({
  id: "player2",
  name: "Bob",
  initialRating: 1000,
});

describe("MatchHistory", () => {
  it("colors positive rating deltas green and negative rating deltas orange", () => {
    render(<MatchHistory matches={[createSinglesSummary()]} readonly />);

    expect(screen.getByText("+8.0")).toHaveClass("text-emerald-600");
    expect(screen.getByText("-8.0")).toHaveClass("text-orange-500");
  });
});

const createSinglesSummary = (): MatchSummary => {
  const match = createMockMatch({
    id: "match1",
    playerAId: alice.id,
    playerBId: bob.id,
    winnerId: alice.id,
    playedAt: "2024-01-02T00:00:00.000Z",
  });

  return {
    match,
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
    players: {
      a: alice,
      b: bob,
    },
    ratingBefore: {
      a: 1000,
      b: 1000,
    },
    ratingAfter: {
      a: 1008,
      b: 992,
    },
    delta: {
      a: 8,
      b: -8,
    },
  };
};
