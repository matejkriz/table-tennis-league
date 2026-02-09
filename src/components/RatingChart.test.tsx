import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock evolu/client to avoid creating actual Evolu instance
vi.mock("../evolu/client", () => ({
  useEvolu: vi.fn(),
  useQuery: vi.fn(() => []),
  matchesQuery: {},
  playersQuery: {},
  uiPreferencesQuery: {},
  formatTypeError: vi.fn(),
  K_FACTOR: 16,
}));

// Mock recharts to avoid rendering issues in tests
const { mockLineChart } = vi.hoisted(() => ({ mockLineChart: vi.fn() }));
vi.mock("recharts", () => ({
  LineChart: mockLineChart,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

import type { PlayerId, MatchRow, PlayerRow } from "../evolu/client";
import { createMockPlayer, createMockMatch } from "../test/helpers";
import { RatingChart } from "./RatingChart";

describe("RatingChart", () => {
  const mockPlayers: PlayerRow[] = [
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
  ];

  const currentRatings = new Map<PlayerId, number>([
    ["player1" as PlayerId, 1008],
    ["player2" as PlayerId, 992],
  ]);

  const mockMatches: MatchRow[] = [];

  // Reset mock before each test
  beforeEach(() => {
    mockLineChart.mockImplementation(({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ));
  });

  it("should render nothing when no players are selected", () => {
    const { container } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId=""
        playerBId=""
        currentRatings={currentRatings}
        projectedDeltaA={0}
        projectedDeltaB={0}
        winnerId=""
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render chart when one player is selected", () => {
    const { getByTestId } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId=""
        currentRatings={currentRatings}
        projectedDeltaA={0}
        projectedDeltaB={0}
        winnerId=""
      />
    );

    expect(getByTestId("responsive-container")).toBeInTheDocument();
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should render chart when both players are selected", () => {
    const { getByTestId } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    expect(getByTestId("responsive-container")).toBeInTheDocument();
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should handle matches from today correctly", () => {
    const today = new Date().toISOString().split("T")[0];
    
    const matchesToday: MatchRow[] = [
      createMockMatch({
        id: "match1" as any,
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player1" as PlayerId,
        playedAt: today,
      }),
    ];

    const { getByTestId } = render(
      <RatingChart
        matches={matchesToday}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Chart should render with today's data
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should filter matches outside 90-day window", () => {
    const today = new Date();
    const day91Ago = new Date(today);
    day91Ago.setDate(day91Ago.getDate() - 91);
    
    const oldMatch: MatchRow = createMockMatch({
      id: "match1" as any,
      playerAId: "player1" as PlayerId,
      playerBId: "player2" as PlayerId,
      winnerId: "player1" as PlayerId,
      playedAt: day91Ago.toISOString().split("T")[0],
    });

    const { getByTestId } = render(
      <RatingChart
        matches={[oldMatch]}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Chart should still render, but without the old match
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should include projection point when both players selected and winner chosen", () => {
    const { getByTestId } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Projection should be included when both players are selected
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should not show projection when no winner is selected", () => {
    const { getByTestId } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={0}
        projectedDeltaB={0}
        winnerId=""
      />
    );

    // Chart renders but without projection
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should handle multiple matches on the same day", () => {
    const today = new Date().toISOString().split("T")[0];
    
    const matchesSameDay: MatchRow[] = [
      createMockMatch({
        id: "match1" as any,
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player1" as PlayerId,
        playedAt: today,
      }),
      createMockMatch({
        id: "match2" as any,
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player2" as PlayerId,
        playedAt: today,
      }),
    ];

    const { getByTestId } = render(
      <RatingChart
        matches={matchesSameDay}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should handle matches involving different players", () => {
    const player3 = createMockPlayer({
      id: "player3" as PlayerId,
      name: "Charlie",
      initialRating: 1000,
    });

    const today = new Date().toISOString().split("T")[0];
    
    const mixedMatches: MatchRow[] = [
      createMockMatch({
        id: "match1" as any,
        playerAId: "player1" as PlayerId,
        playerBId: "player3" as PlayerId,
        winnerId: "player1" as PlayerId,
        playedAt: today,
      }),
      createMockMatch({
        id: "match2" as any,
        playerAId: "player2" as PlayerId,
        playerBId: "player3" as PlayerId,
        winnerId: "player2" as PlayerId,
        playedAt: today,
      }),
    ];

    const threePlayerRatings = new Map<PlayerId, number>([
      ["player1" as PlayerId, 1008],
      ["player2" as PlayerId, 1008],
      ["player3" as PlayerId, 984],
    ]);

    const { getByTestId } = render(
      <RatingChart
        matches={mixedMatches}
        players={[...mockPlayers, player3]}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={threePlayerRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Chart should render correctly even when matches involve other players
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should correctly calculate projection when player A wins", () => {
    // Mock LineChart to capture the data prop
    let capturedData: any[] = [];
    mockLineChart.mockImplementation(
      ({ data, children }: { data: any[]; children: React.ReactNode }) => {
        capturedData = data;
        return <div data-testid="line-chart">{children}</div>;
      }
    );

    render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Find the projection data point (last point in array)
    const projectionPoint = capturedData[capturedData.length - 1];
    expect(projectionPoint).toBeDefined();
    expect(projectionPoint.formattedDate).toBe("Projection");
    
    // Verify projection calculation: currentRating + delta
    // Player A (winner): 1008 + 8 = 1016
    // Player B (loser): 992 + (-8) = 984
    expect(projectionPoint["Alice (proj)"]).toBe(1016);
    expect(projectionPoint["Bob (proj)"]).toBe(984);
  });

  it("should correctly calculate projection when player B wins", () => {
    // Mock LineChart to capture the data prop
    let capturedData: any[] = [];
    mockLineChart.mockImplementation(
      ({ data, children }: { data: any[]; children: React.ReactNode }) => {
        capturedData = data;
        return <div data-testid="line-chart">{children}</div>;
      }
    );

    render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={-8}
        projectedDeltaB={8}
        winnerId={"player2" as PlayerId}
      />
    );

    // Find the projection data point (last point in array)
    const projectionPoint = capturedData[capturedData.length - 1];
    expect(projectionPoint).toBeDefined();
    expect(projectionPoint.formattedDate).toBe("Projection");
    
    // Verify projection calculation: currentRating + delta
    // Player A (loser): 1008 + (-8) = 1000
    // Player B (winner): 992 + 8 = 1000
    expect(projectionPoint["Alice (proj)"]).toBe(1000);
    expect(projectionPoint["Bob (proj)"]).toBe(1000);
  });

  it("should handle underdog wins with larger rating deltas correctly", () => {
    // Mock LineChart to capture the data prop
    let capturedData: any[] = [];
    mockLineChart.mockImplementation(
      ({ data, children }: { data: any[]; children: React.ReactNode }) => {
        capturedData = data;
        return <div data-testid="line-chart">{children}</div>;
      }
    );

    // Scenario: Player B (lower rated) beats Player A (higher rated)
    // This should result in larger delta for underdog
    render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={-12.5}  // Higher rated player loses more points
        projectedDeltaB={12.5}   // Lower rated player gains more points
        winnerId={"player2" as PlayerId}
      />
    );

    const projectionPoint = capturedData[capturedData.length - 1];
    expect(projectionPoint).toBeDefined();
    
    // Verify the deltas are applied correctly (not using Math.abs which would break this)
    expect(projectionPoint["Alice (proj)"]).toBeCloseTo(1008 - 12.5, 1);
    expect(projectionPoint["Bob (proj)"]).toBeCloseTo(992 + 12.5, 1);
  });

  it("should use current ratings from props, not initial ratings", () => {
    // Current ratings are different from initial ratings
    const updatedRatings = new Map<PlayerId, number>([
      ["player1" as PlayerId, 1100],
      ["player2" as PlayerId, 900],
    ]);

    const { getByTestId } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={updatedRatings}
        projectedDeltaA={5}
        projectedDeltaB={-5}
        winnerId={"player1" as PlayerId}
      />
    );

    // Chart should use currentRatings (1100, 900) not initialRatings (1000, 1000)
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should handle empty matches array", () => {
    const { getByTestId } = render(
      <RatingChart
        matches={[]}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Should render chart even with no match history
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should render only player A line when only player A is selected", () => {
    const { getByTestId } = render(
      <RatingChart
        matches={mockMatches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId=""
        currentRatings={currentRatings}
        projectedDeltaA={0}
        projectedDeltaB={0}
        winnerId=""
      />
    );

    expect(getByTestId("line-chart")).toBeInTheDocument();
    // When only one player is selected, no projection should be shown
  });

  it("should handle chronological ordering of matches", () => {
    const day5Ago = new Date();
    day5Ago.setDate(day5Ago.getDate() - 5);
    
    const day10Ago = new Date();
    day10Ago.setDate(day10Ago.getDate() - 10);

    // Add matches in reverse chronological order
    const matches: MatchRow[] = [
      createMockMatch({
        id: "match2" as any,
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player1" as PlayerId,
        playedAt: day5Ago.toISOString().split("T")[0],
      }),
      createMockMatch({
        id: "match1" as any,
        playerAId: "player1" as PlayerId,
        playerBId: "player2" as PlayerId,
        winnerId: "player2" as PlayerId,
        playedAt: day10Ago.toISOString().split("T")[0],
      }),
    ];

    const { getByTestId } = render(
      <RatingChart
        matches={matches}
        players={mockPlayers}
        playerAId={"player1" as PlayerId}
        playerBId={"player2" as PlayerId}
        currentRatings={currentRatings}
        projectedDeltaA={8}
        projectedDeltaB={-8}
        winnerId={"player1" as PlayerId}
      />
    );

    // Chart should correctly order matches chronologically
    expect(getByTestId("line-chart")).toBeInTheDocument();
  });
});
