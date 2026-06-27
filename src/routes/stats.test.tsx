import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
}));

vi.mock("../components/CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    children,
  }: {
    readonly title: string;
    readonly children: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock("../components/MatchHistory", () => ({
  MatchHistory: () => <div>Match history content</div>,
}));

vi.mock("../hooks/useLeagueData", () => ({
  useLeagueData: vi.fn(),
}));

vi.mock("../hooks/useStatsRankingFilterPreference", () => ({
  useStatsRankingFilterPreference: vi.fn(),
}));

import type { MatchSummary, RankingEntry } from "../hooks/useLeagueData";
import { useLeagueData } from "../hooks/useLeagueData";
import { useStatsRankingFilterPreference } from "../hooks/useStatsRankingFilterPreference";
import type { PlayerRow } from "../evolu/client";
import { createMockMatch, createMockPlayer } from "../test/helpers";
import { StatsPage } from "./stats";

type StatsRankingFilter = "7d" | "30d" | "all";

describe("StatsPage", () => {
  let currentFilter: StatsRankingFilter;

  const players = {
    alice: createMockPlayer({ id: "player1", name: "Alice", initialRating: 1200 }),
    bob: createMockPlayer({ id: "player2", name: "Bob", initialRating: 1100 }),
    charlie: createMockPlayer({ id: "player3", name: "Charlie", initialRating: 1000 }),
    dana: createMockPlayer({ id: "player4", name: "Dana", initialRating: 900 }),
  };

  const ranking: ReadonlyArray<RankingEntry & { readonly wins: number; readonly losses: number }> = [
    { player: players.alice, rating: 1230, delta: 30, matchCount: 4, wins: 3, losses: 1 },
    { player: players.bob, rating: 1115, delta: 15, matchCount: 3, wins: 1, losses: 2 },
    { player: players.charlie, rating: 980, delta: -20, matchCount: 2, wins: 0, losses: 2 },
    { player: players.dana, rating: 900, delta: 0, matchCount: 0, wins: 0, losses: 0 },
  ];

  const matches: ReadonlyArray<MatchSummary> = [
    createMatchSummary({
      id: "match-recent",
      playedAt: "2024-01-30T12:00:00.000Z",
      participants: [players.alice, players.bob],
    }),
    createMatchSummary({
      id: "match-window",
      playedAt: "2024-01-10T12:00:00.000Z",
      participants: [players.bob],
    }),
    createMatchSummary({
      id: "match-old",
      playedAt: "2023-12-20T12:00:00.000Z",
      participants: [players.charlie],
    }),
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"));
    currentFilter = "30d";

    vi.mocked(useLeagueData).mockReturnValue({
      players: Object.values(players),
      playersById: new Map(),
      matches,
      ranking,
    } as ReturnType<typeof useLeagueData>);

    vi.mocked(useStatsRankingFilterPreference).mockImplementation(() => [
      currentFilter,
      (nextFilter: StatsRankingFilter) => {
        currentFilter = nextFilter;
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to the last 30 days filter and updates the visible ranking entries", async () => {
    const { rerender } = render(<StatsPage />);

    expect(screen.getAllByText("Last match in:").length).toBeGreaterThan(0);
    expect(screen.getByRole("radio", { name: "30 days" })).toBeChecked();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    expect(screen.queryByText("Dana")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    rerender(<StatsPage />);

    expect(screen.getByRole("radio", { name: "7 days" })).toBeChecked();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    expect(screen.queryByText("Dana")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Anytime" }));
    rerender(<StatsPage />);

    expect(screen.getByRole("radio", { name: "Anytime" })).toBeChecked();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();
  });

  it("shows an empty state when no players match the active time window", () => {
    currentFilter = "7d";
    vi.mocked(useLeagueData).mockReturnValue({
      players: Object.values(players),
      playersById: new Map(),
      matches: [
        createMatchSummary({
          id: "match-oldest",
          playedAt: "2024-01-20T12:00:00.000Z",
          participants: [players.charlie],
        }),
      ],
      ranking,
    } as ReturnType<typeof useLeagueData>);

    render(<StatsPage />);

    expect(screen.getByText("No players played in this period.")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("shows each player's win-loss balance instead of rating delta", () => {
    render(<StatsPage />);

    const aliceRow = screen.getByText("Alice").closest("li");
    expect(aliceRow).not.toBeNull();

    expect(within(aliceRow!).getByText("3")).toHaveClass("text-emerald-600");
    expect(within(aliceRow!).getByText(":")).toHaveClass("text-black/30");

    const orangeLoss = within(aliceRow!).getAllByText("1").find((element) =>
      element.classList.contains("text-orange-500"),
    );
    expect(orangeLoss).toBeDefined();
    expect(within(aliceRow!).queryByText("+30.0")).not.toBeInTheDocument();
  });
});

const createMatchSummary = ({
  id,
  playedAt,
  participants,
}: {
  readonly id: string;
  readonly playedAt: string;
  readonly participants: ReadonlyArray<PlayerRow>;
}): MatchSummary =>
  ({
    match: createMockMatch({
      id,
      playerAId: participants[0]?.id ?? "player1",
      playerBId: participants[1]?.id ?? participants[0]?.id ?? "player2",
      winnerId: participants[0]?.id ?? "player1",
      playedAt,
    }),
    isDoubles: false,
    winnerTeam: "A",
    teamAPlayers: participants[0] ? [participants[0]] : [],
    teamBPlayers: participants[1] ? [participants[1]] : [],
    participants: participants.map((player, index) => ({
      player,
      team: index === 0 ? "A" : "B",
      ratingBefore: 1000,
      ratingAfter: 1000,
      delta: 0,
    })),
    players: {
      a: participants[0],
      b: participants[1],
    },
    ratingBefore: {
      a: 1000,
      b: 1000,
    },
    ratingAfter: {
      a: 1000,
      b: 1000,
    },
    delta: {
      a: 0,
      b: 0,
    },
  }) as MatchSummary;
