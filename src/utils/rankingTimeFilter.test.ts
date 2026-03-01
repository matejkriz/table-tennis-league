import { describe, expect, it } from "vitest";

import { filterRankingByLastMatch } from "./rankingTimeFilter";

interface TestRankingEntry {
  readonly player: {
    readonly id: string;
  };
  readonly rating: number;
}

interface TestMatchSummary {
  readonly match: {
    readonly playedAt: string;
  };
  readonly participants: ReadonlyArray<{
    readonly player: {
      readonly id: string;
    };
  }>;
}

const createMatchSummary = (
  playerId: string,
  playedAt: string,
): TestMatchSummary => ({
  match: { playedAt },
  participants: [{ player: { id: playerId } }],
});

describe("filterRankingByLastMatch", () => {
  const ranking: ReadonlyArray<TestRankingEntry> = [
    { player: { id: "p1" }, rating: 1100 },
    { player: { id: "p2" }, rating: 1080 },
    { player: { id: "p3" }, rating: 1050 },
    { player: { id: "p4" }, rating: 1020 },
    { player: { id: "p5" }, rating: 1000 },
  ];

  const now = new Date("2026-03-18T12:00:00.000Z");

  const matches: ReadonlyArray<TestMatchSummary> = [
    createMatchSummary("p1", "2026-03-17T12:00:00.000Z"), // this week
    createMatchSummary("p2", "2026-03-04T12:00:00.000Z"), // this month
    createMatchSummary("p3", "2026-01-05T12:00:00.000Z"), // this quarter
    createMatchSummary("p4", "2025-12-30T12:00:00.000Z"), // previous quarter
    createMatchSummary("p2", "2026-02-25T12:00:00.000Z"), // older record for p2
  ];

  it("returns full ranking for the all filter", () => {
    const filtered = filterRankingByLastMatch({
      ranking,
      matches,
      timeFilter: "all",
      now,
    });

    expect(filtered).toBe(ranking);
  });

  it("keeps only players whose latest match is in the current week", () => {
    const filtered = filterRankingByLastMatch({
      ranking,
      matches,
      timeFilter: "week",
      now,
    });

    expect(filtered.map((entry) => entry.player.id)).toEqual(["p1"]);
  });

  it("keeps only players whose latest match is in the current month", () => {
    const filtered = filterRankingByLastMatch({
      ranking,
      matches,
      timeFilter: "month",
      now,
    });

    expect(filtered.map((entry) => entry.player.id)).toEqual(["p1", "p2"]);
  });

  it("keeps only players whose latest match is in the current quarter", () => {
    const filtered = filterRankingByLastMatch({
      ranking,
      matches,
      timeFilter: "quarter",
      now,
    });

    expect(filtered.map((entry) => entry.player.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("ignores invalid match dates when deriving latest match timestamps", () => {
    const filtered = filterRankingByLastMatch({
      ranking,
      matches: [
        ...matches,
        createMatchSummary("p5", "not-a-date"),
      ],
      timeFilter: "quarter",
      now,
    });

    expect(filtered.map((entry) => entry.player.id)).toEqual(["p1", "p2", "p3"]);
  });
});
