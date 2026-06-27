import { describe, expect, it, vi } from "vitest";

// Mock Evolu before any imports that use it
vi.mock("../evolu/client", () => ({
  useQuery: vi.fn(),
  playersQuery: { toString: () => "player" },
  allPlayersQuery: { toString: () => "all-player" },
  matchesQuery: { toString: () => "match" },
}));

import { renderHook } from "@testing-library/react";
import type { PlayerId } from "../evolu/client";
import { allPlayersQuery, playersQuery, useQuery } from "../evolu/client";
import { K_FACTOR, useLeagueData } from "./useLeagueData";
import { createMockMatch, createMockPlayer } from "../test/helpers";

describe("useLeagueData", () => {
  const mockPlayers = [
    createMockPlayer({
      id: "player1" as PlayerId,
      name: "Alice",
      initialRating: 1000,
    }),
    createMockPlayer({
      id: "player2" as PlayerId,
      name: "Bob",
      initialRating: 1000,
    }),
    createMockPlayer({
      id: "player3" as PlayerId,
      name: "Charlie",
      initialRating: 1200,
    }),
  ];

  it("should initialize players with their initial ratings", () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    expect(result.current.players).toHaveLength(3);
    expect(result.current.ranking).toHaveLength(3);
    expect(result.current.ranking[0].rating).toBe(1200); // Charlie highest
    expect(result.current.ranking[1].rating).toBe(1000); // Alice or Bob
    expect(result.current.ranking[2].rating).toBe(1000);
  });

  it("should calculate rating changes correctly after a match", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player1" as PlayerId,
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    // Alice should gain rating, Bob should lose rating
    const aliceRanking = result.current.ranking.find(
      (r) => r.player.name === "Alice"
    );
    const bobRanking = result.current.ranking.find(
      (r) => r.player.name === "Bob"
    );

    expect(aliceRanking?.rating).toBeGreaterThan(1000);
    expect(bobRanking?.rating).toBeLessThan(1000);
    expect(aliceRanking?.matchCount).toBe(1);
    expect(bobRanking?.matchCount).toBe(1);
  });

  it("should apply K-factor of 16 for rating changes", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId, // Alice (1000)
        playerBId: "player2" as PlayerId, // Bob (1000)
        winnerId: "player1" as PlayerId, // Alice wins
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    const matchSummary = result.current.matches[0];

    // Expected score for equal ratings: 0.5 each
    // Actual score: winner gets 1, loser gets 0
    // Delta = K * (actual - expected) = 16 * (1 - 0.5) = 8 for winner
    // Delta = K * (actual - expected) = 16 * (0 - 0.5) = -8 for loser
    expect(matchSummary.delta.a).toBeCloseTo(8, 1);
    expect(matchSummary.delta.b).toBeCloseTo(-8, 1);
  });

  it("should calculate expected scores correctly for different ratings", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId, // Alice (1000)
        playerBId: "player3" as PlayerId, // Charlie (1200)
        winnerId: "player1" as PlayerId, // Alice wins (upset!)
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    const matchSummary = result.current.matches[0];

    // Alice (lower rating) wins, so should gain more points
    // Charlie (higher rating) loses, so should lose more points
    expect(matchSummary.delta.a).toBeGreaterThan(8); // Bigger gain for upset
    expect(matchSummary.delta.b).toBeLessThan(-8); // Bigger loss for upset
  });

  it("should calculate doubles team deltas and split by teammate ratings", () => {
    const doublesPlayers = [
      createMockPlayer({
        id: "player1" as PlayerId,
        name: "Alice",
        initialRating: 1000,
      }),
      createMockPlayer({
        id: "player2" as PlayerId,
        name: "Bob",
        initialRating: 1200,
      }),
      createMockPlayer({
        id: "player3" as PlayerId,
        name: "Charlie",
        initialRating: 900,
      }),
      createMockPlayer({
        id: "player4" as PlayerId,
        name: "Dana",
        initialRating: 1100,
      }),
    ];

    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId,
        playerA2Id: "player2" as PlayerId,
        playerBId: "player3" as PlayerId,
        playerB2Id: "player4" as PlayerId,
        winnerId: "player1" as PlayerId,
        winnerTeam: "A",
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return doublesPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());
    const summary = result.current.matches[0];

    expect(summary.isDoubles).toBe(true);
    expect(summary.teamAPlayers).toHaveLength(2);
    expect(summary.teamBPlayers).toHaveLength(2);

    const teamADelta = (summary.delta.a ?? 0) + (summary.delta.aTeammate ?? 0);
    const teamBDelta = (summary.delta.b ?? 0) + (summary.delta.bTeammate ?? 0);
    expect(teamADelta).toBeCloseTo(-teamBDelta, 5);

    // Split proportion follows teammate pre-match ratings:
    // Alice:Bob = 1000:1200
    expect((summary.delta.a ?? 0) / (summary.delta.aTeammate ?? 1)).toBeCloseTo(
      1000 / 1200,
      2,
    );
    // Charlie:Dana = 900:1100
    expect((summary.delta.b ?? 0) / (summary.delta.bTeammate ?? 1)).toBeCloseTo(
      900 / 1100,
      2,
    );
  });

  it("should process matches in chronological order", () => {
    const matches = [
      createMockMatch({
        id: "match2",
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player1" as PlayerId,
        playedAt: "2024-01-03T00:00:00.000Z", // Later
      }),
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player2" as PlayerId,
        playedAt: "2024-01-02T00:00:00.000Z", // Earlier
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    // First processed match should be the one with earlier playedAt
    expect(result.current.matches[0].match.id).toBe("match1");
    expect(result.current.matches[1].match.id).toBe("match2");
  });

  it("should calculate total delta from initial rating", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId, // Alice
        playerBId: "player2" as PlayerId, // Bob
        winnerId: "player1" as PlayerId,
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
      createMockMatch({
        id: "match2",
        playerAId: "player1" as PlayerId, // Alice
        playerBId: "player2" as PlayerId, // Bob
        winnerId: "player1" as PlayerId,
        playedAt: "2024-01-03T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    const aliceRanking = result.current.ranking.find(
      (r) => r.player.name === "Alice"
    );
    const bobRanking = result.current.ranking.find(
      (r) => r.player.name === "Bob"
    );

    // Delta should be total change from initial rating
    expect(aliceRanking?.delta).toBe(
      aliceRanking!.rating - aliceRanking!.player.initialRating
    );
    expect(bobRanking?.delta).toBe(
      bobRanking!.rating - bobRanking!.player.initialRating
    );
    expect(aliceRanking?.delta).toBeGreaterThan(0);
    expect(bobRanking?.delta).toBeLessThan(0);
  });

  it("should sort ranking by rating (highest first)", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId, // Alice (1000)
        playerBId: "player3" as PlayerId, // Charlie (1200)
        winnerId: "player1" as PlayerId, // Alice wins, should overtake Charlie
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    // Rankings should be sorted descending by rating
    for (let i = 0; i < result.current.ranking.length - 1; i++) {
      expect(result.current.ranking[i].rating).toBeGreaterThanOrEqual(
        result.current.ranking[i + 1].rating
      );
    }
  });

  it("should track match count for each player", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId, // Alice
        playerBId: "player2" as PlayerId, // Bob
        winnerId: "player1" as PlayerId,
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
      createMockMatch({
        id: "match2",
        playerAId: "player1" as PlayerId, // Alice
        playerBId: "player3" as PlayerId, // Charlie
        winnerId: "player3" as PlayerId,
        playedAt: "2024-01-03T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    const aliceRanking = result.current.ranking.find(
      (r) => r.player.name === "Alice"
    );
    const bobRanking = result.current.ranking.find(
      (r) => r.player.name === "Bob"
    );
    const charlieRanking = result.current.ranking.find(
      (r) => r.player.name === "Charlie"
    );

    expect(aliceRanking?.matchCount).toBe(2);
    expect(bobRanking?.matchCount).toBe(1);
    expect(charlieRanking?.matchCount).toBe(1);
  });

  it("should track wins and losses for each player", () => {
    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId, // Alice
        playerBId: "player2" as PlayerId, // Bob
        winnerId: "player1" as PlayerId,
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
      createMockMatch({
        id: "match2",
        playerAId: "player1" as PlayerId, // Alice
        playerBId: "player3" as PlayerId, // Charlie
        winnerId: "player3" as PlayerId,
        playedAt: "2024-01-03T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    const aliceRanking = result.current.ranking.find(
      (r) => r.player.name === "Alice",
    );
    const bobRanking = result.current.ranking.find((r) => r.player.name === "Bob");
    const charlieRanking = result.current.ranking.find(
      (r) => r.player.name === "Charlie",
    );

    expect(aliceRanking).toMatchObject({ wins: 1, losses: 1 });
    expect(bobRanking).toMatchObject({ wins: 0, losses: 1 });
    expect(charlieRanking).toMatchObject({ wins: 1, losses: 0 });
  });

  it("should create playersById map for quick lookup", () => {
    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (String(query).includes("player")) return mockPlayers;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    expect(result.current.playersById.size).toBe(3);
    expect(result.current.playersById.get("player1" as PlayerId)?.name).toBe(
      "Alice"
    );
    expect(result.current.playersById.get("player2" as PlayerId)?.name).toBe("Bob");
    expect(result.current.playersById.get("player3" as PlayerId)?.name).toBe(
      "Charlie"
    );
  });

  it("should return empty rankings when no players exist", () => {
    vi.mocked(useQuery).mockImplementation(() => []);

    const { result } = renderHook(() => useLeagueData());

    expect(result.current.players).toHaveLength(0);
    expect(result.current.ranking).toHaveLength(0);
    expect(result.current.matches).toHaveLength(0);
  });

  it("should verify K-factor constant is 16", () => {
    expect(K_FACTOR).toBe(16);
  });

  it("keeps deleted players in historical matches and rating progression but hides them from active players and ranking", () => {
    const allPlayers = [
      createMockPlayer({
        id: "player1" as PlayerId,
        name: "Alice",
        initialRating: 1000,
      }),
      createMockPlayer({
        id: "player2" as PlayerId,
        name: "Bob",
        initialRating: 1000,
        deletedAt: "2024-01-04T10:00:00.000Z",
      }),
      createMockPlayer({
        id: "player3" as PlayerId,
        name: "Charlie",
        initialRating: 1000,
      }),
    ];

    const activePlayers = [allPlayers[0], allPlayers[2]];

    const matches = [
      createMockMatch({
        id: "match1",
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player2" as PlayerId,
        playedAt: "2024-01-02T00:00:00.000Z",
      }),
      createMockMatch({
        id: "match2",
        playerAId: "player2" as PlayerId,
        playerBId: "player3" as PlayerId,
        winnerId: "player2" as PlayerId,
        playedAt: "2024-01-03T00:00:00.000Z",
      }),
    ];

    vi.mocked(useQuery).mockImplementation((query: unknown) => {
      if (query === allPlayersQuery) return allPlayers;
      if (query === playersQuery) return activePlayers;
      if (String(query).includes("match")) return matches;
      return [];
    });

    const { result } = renderHook(() => useLeagueData());

    expect(result.current.players.map((player) => player.name)).toEqual([
      "Alice",
      "Charlie",
    ]);
    expect(result.current.ranking.map((entry) => entry.player.name).sort()).toEqual([
      "Alice",
      "Charlie",
    ]);
    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matches[0].participants.map((participant) => participant.player.name)).toEqual([
      "Alice",
      "Bob",
    ]);
    expect(result.current.matches[1].participants.map((participant) => participant.player.name)).toEqual([
      "Bob",
      "Charlie",
    ]);
    expect(result.current.playersById.get("player2" as PlayerId)?.name).toBe("Bob");

    const aliceRanking = result.current.ranking.find(
      (entry) => entry.player.name === "Alice",
    );
    const charlieRanking = result.current.ranking.find(
      (entry) => entry.player.name === "Charlie",
    );

    expect(aliceRanking?.rating).toBeLessThan(1000);
    expect(charlieRanking?.rating).toBeLessThan(1000);
  });
});
