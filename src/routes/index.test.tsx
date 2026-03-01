import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MatchSummary } from "../hooks/useLeagueData";

const mockNavigate = vi.fn();
const mockUseLeagueData = vi.fn();
const mockShouldRedirectRootToStart = vi.fn();
const mockSetHistoryOpen = vi.fn();

let lastMatchHistoryProps: {
  readonly matches: ReadonlyArray<MatchSummary>;
  readonly scrollToMatchId?: string;
} | null = null;

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../hooks/useLeagueData", () => ({
  useLeagueData: () => mockUseLeagueData(),
}));

vi.mock("../utils/startAccess", () => ({
  shouldRedirectRootToStart: (...args: unknown[]) =>
    mockShouldRedirectRootToStart(...args),
}));

vi.mock("../hooks/useCollapsibleState", () => ({
  useCollapsibleState: () => [false, vi.fn(), mockSetHistoryOpen],
}));

vi.mock("../hooks/useDoublesPreference", () => ({
  useDoublesPreference: () => [false],
}));

vi.mock("../components/MatchRecorder", () => ({
  MatchRecorder: ({
    onMatchRecorded,
  }: {
    readonly onMatchRecorded?: (payload: {
      playedAt: string;
      winnerLabel: string;
      loserLabel: string;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onMatchRecorded?.({
          playedAt: "2026-03-01T10:00:00.000Z",
          winnerLabel: "Alice",
          loserLabel: "Bob",
        })
      }
    >
      Trigger match recorded
    </button>
  ),
}));

vi.mock("../components/MatchHistory", () => ({
  MatchHistory: (props: {
    readonly matches: ReadonlyArray<MatchSummary>;
    readonly scrollToMatchId?: string;
  }) => {
    lastMatchHistoryProps = props;
    return (
      <div data-testid="match-history" data-scroll-to-match-id={props.scrollToMatchId ?? ""}>
        Match history content
      </div>
    );
  },
}));

vi.mock("../components/CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    children,
    isOpen,
  }: {
    readonly title: string;
    readonly children: ReactNode;
    readonly isOpen?: boolean;
  }) => (
    <section data-testid={`section-${title}`} data-open={isOpen == null ? "" : String(isOpen)}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("../components/RankingList", () => ({
  RankingList: () => <div>Ranking list content</div>,
}));

import { MatchPage } from "./index";

describe("MatchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastMatchHistoryProps = null;

    mockShouldRedirectRootToStart.mockReturnValue(false);
    mockUseLeagueData.mockReturnValue({
      players: [
        { id: "p1", name: "Alice", initialRating: 1000 },
        { id: "p2", name: "Bob", initialRating: 1000 },
      ],
      playersById: new Map(),
      ranking: [
        {
          player: { id: "p1", name: "Alice", initialRating: 1000 },
          rating: 1010,
          delta: 10,
          matchCount: 1,
        },
        {
          player: { id: "p2", name: "Bob", initialRating: 1000 },
          rating: 990,
          delta: -10,
          matchCount: 1,
        },
      ],
      matches: [
        {
          match: {
            id: "match-new",
            playedAt: "2026-03-01T10:00:00.000Z",
          },
          winnerTeam: "A",
          teamAPlayers: [{ id: "p1", name: "Alice" }],
          teamBPlayers: [{ id: "p2", name: "Bob" }],
          participants: [],
        },
      ],
    });
  });

  it("shows toast, opens match history, and targets the new match after record callback", async () => {
    const user = userEvent.setup();
    render(<MatchPage />);

    await user.click(screen.getByRole("button", { name: "Trigger match recorded" }));

    await waitFor(() => {
      expect(screen.getByText("Match recorded")).toBeInTheDocument();
    });

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(mockSetHistoryOpen).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(lastMatchHistoryProps?.scrollToMatchId).toBe("match-new");
    });
  });
});
