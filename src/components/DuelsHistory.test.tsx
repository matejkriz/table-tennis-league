import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MatchSummary } from "../hooks/useLeagueData";
import type { MatchRow, PlayerId, PlayerRow } from "../evolu/client";
import { createMockMatch, createMockPlayer } from "../test/helpers";
import { DuelsHistory } from "./DuelsHistory";

vi.mock("./MatchHistory", () => ({
  MatchHistory: ({
    matches,
  }: {
    readonly matches: ReadonlyArray<MatchSummary>;
  }) => (
    <div>
      {matches.map((match) => (
        <div key={match.match.id}>{match.match.note}</div>
      ))}
    </div>
  ),
}));

const alice = createMockPlayer({
  id: "player1" as PlayerId,
  name: "Alice",
  initialRating: 1000,
});
const bob = createMockPlayer({
  id: "player2" as PlayerId,
  name: "Bob",
  initialRating: 1000,
});
const charlie = createMockPlayer({
  id: "player3" as PlayerId,
  name: "Charlie",
  initialRating: 1000,
});
const dana = createMockPlayer({
  id: "player4" as PlayerId,
  name: "Dana",
  initialRating: 1000,
});

const createSummary = ({
  id,
  teamAPlayers,
  teamBPlayers,
  winnerTeam,
  note,
}: {
  readonly id: MatchRow["id"];
  readonly teamAPlayers: ReadonlyArray<PlayerRow>;
  readonly teamBPlayers: ReadonlyArray<PlayerRow>;
  readonly winnerTeam: "A" | "B";
  readonly note: string;
}): MatchSummary => {
  const match = createMockMatch({
    id,
    playerAId: teamAPlayers[0].id,
    playerBId: teamBPlayers[0].id,
    playerA2Id: teamAPlayers[1]?.id ?? null,
    playerB2Id: teamBPlayers[1]?.id ?? null,
    winnerId: winnerTeam === "A" ? teamAPlayers[0].id : teamBPlayers[0].id,
    winnerTeam: teamAPlayers.length > 1 ? winnerTeam : null,
    note,
    playedAt: "2024-01-02T00:00:00.000Z",
  });

  const participants = [
    ...teamAPlayers.map((player) => ({
      player,
      team: "A" as const,
      ratingBefore: 1000,
      ratingAfter: 1008,
      delta: 8,
    })),
    ...teamBPlayers.map((player) => ({
      player,
      team: "B" as const,
      ratingBefore: 1000,
      ratingAfter: 992,
      delta: -8,
    })),
  ];

  return {
    match,
    isDoubles: teamAPlayers.length > 1,
    winnerTeam,
    teamAPlayers,
    teamBPlayers,
    participants,
    players: {
      a: teamAPlayers[0],
      b: teamBPlayers[0],
      aTeammate: teamAPlayers[1],
      bTeammate: teamBPlayers[1],
    },
    ratingBefore: {
      a: 1000,
      b: 1000,
      aTeammate: teamAPlayers[1] ? 1000 : undefined,
      bTeammate: teamBPlayers[1] ? 1000 : undefined,
    },
    ratingAfter: {
      a: 1008,
      b: 992,
      aTeammate: teamAPlayers[1] ? 1008 : undefined,
      bTeammate: teamBPlayers[1] ? 992 : undefined,
    },
    delta: {
      a: 8,
      b: -8,
      aTeammate: teamAPlayers[1] ? 8 : undefined,
      bTeammate: teamBPlayers[1] ? -8 : undefined,
    },
  };
};

const matches: ReadonlyArray<MatchSummary> = [
  createSummary({
    id: "match1" as MatchRow["id"],
    teamAPlayers: [alice],
    teamBPlayers: [bob],
    winnerTeam: "A",
    note: "singles-alice-vs-bob",
  }),
  createSummary({
    id: "match2" as MatchRow["id"],
    teamAPlayers: [alice, charlie],
    teamBPlayers: [bob, dana],
    winnerTeam: "A",
    note: "doubles-alice-charlie-vs-bob-dana",
  }),
  createSummary({
    id: "match3" as MatchRow["id"],
    teamAPlayers: [alice, bob],
    teamBPlayers: [charlie, dana],
    winnerTeam: "A",
    note: "doubles-alice-bob-vs-charlie-dana",
  }),
  createSummary({
    id: "match4" as MatchRow["id"],
    teamAPlayers: [charlie],
    teamBPlayers: [dana],
    winnerTeam: "A",
    note: "singles-charlie-vs-dana",
  }),
];

describe("DuelsHistory", () => {
  it("shows a prompt when no singles players are selected", () => {
    render(
      <DuelsHistory
        matches={matches}
        activeSelection={{ mode: "singles", playerAId: "", playerBId: "" }}
      />,
    );

    expect(
      screen.getByText("Select at least one player to see matches."),
    ).toBeInTheDocument();
  });

  it("shows all matches for one selected singles player", () => {
    render(
      <DuelsHistory
        matches={matches}
        activeSelection={{
          mode: "singles",
          playerAId: alice.id,
          playerBId: "",
        }}
      />,
    );

    expect(screen.getByText("singles-alice-vs-bob")).toBeInTheDocument();
    expect(
      screen.getByText("doubles-alice-charlie-vs-bob-dana"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("doubles-alice-bob-vs-charlie-dana"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("singles-charlie-vs-dana"),
    ).not.toBeInTheDocument();
  });

  it("shows only opposite-side head-to-head matches for two selected singles players", () => {
    render(
      <DuelsHistory
        matches={matches}
        activeSelection={{
          mode: "singles",
          playerAId: alice.id,
          playerBId: bob.id,
        }}
      />,
    );

    expect(screen.getByText("singles-alice-vs-bob")).toBeInTheDocument();
    expect(
      screen.getByText("doubles-alice-charlie-vs-bob-dana"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("doubles-alice-bob-vs-charlie-dana"),
    ).not.toBeInTheDocument();
  });

  it("shows matches containing all selected doubles players regardless of pairing", () => {
    render(
      <DuelsHistory
        matches={matches}
        activeSelection={{
          mode: "doubles",
          playerAId: alice.id,
          playerA2Id: bob.id,
          playerBId: "",
          playerB2Id: "",
        }}
      />,
    );

    expect(screen.getByText("singles-alice-vs-bob")).toBeInTheDocument();
    expect(
      screen.getByText("doubles-alice-charlie-vs-bob-dana"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("doubles-alice-bob-vs-charlie-dana"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("singles-charlie-vs-dana"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when selected players have no matching duels", () => {
    render(
      <DuelsHistory
        matches={matches}
        activeSelection={{
          mode: "doubles",
          playerAId: alice.id,
          playerA2Id: "player5" as PlayerId,
          playerBId: "",
          playerB2Id: "",
        }}
      />,
    );

    expect(
      screen.getByText("Let's play your first duel!"),
    ).toBeInTheDocument();
  });
});
