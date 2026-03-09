import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Evolu before any imports that use it
vi.mock("../evolu/client", () => ({
  useEvolu: vi.fn(),
  useQuery: vi.fn(() => []),
  uiPreferencesQuery: {},
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
}));
vi.mock("../hooks/pushNotificationsContext", () => ({
  usePushNotifications: vi.fn(),
}));
vi.mock("../hooks/useLeagueData", () => ({
  useLeagueData: vi.fn(),
  K_FACTOR: 16,
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerId, MatchRow } from "../evolu/client";
import { useEvolu } from "../evolu/client";
import { usePushNotifications } from "../hooks/pushNotificationsContext";
import { useLeagueData } from "../hooks/useLeagueData";
import { MatchRecorder } from "./MatchRecorder";
import { createMockPlayer } from "../test/helpers";

type InsertResult = { ok: true } | { ok: false; error: { type: string } };

describe("MatchRecorder", () => {
  const mockPlayers = [
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
      initialRating: 800,
    }),
    createMockPlayer({
      id: "player4" as PlayerId,
      name: "Dana",
      initialRating: 920,
    }),
  ];

  const mockCurrentRatings = new Map<PlayerId, number>([
    ["player1" as PlayerId, 1050],
    ["player2" as PlayerId, 1180],
    ["player3" as PlayerId, 850],
    ["player4" as PlayerId, 920],
  ]);

  const mockMatches: MatchRow[] = [];

  const mockInsert = vi.fn<
    (table: string, data: unknown, options?: { onComplete?: () => void }) => InsertResult
  >(() => ({ ok: true }));
  const mockEnqueueMatchNotification = vi.fn();

  const selectSinglesPlayers = async (
    user: ReturnType<typeof userEvent.setup>,
    playerAId: PlayerId = "player1" as PlayerId,
    playerBId: PlayerId = "player2" as PlayerId,
  ) => {
    await user.selectOptions(screen.getByLabelText(/player a/i), playerAId);
    await user.selectOptions(screen.getByLabelText(/player b/i), playerBId);
  };

  const prepareSinglesMatch = async (
    user: ReturnType<typeof userEvent.setup>,
    winnerName: "Alice" | "Bob" = "Alice",
  ) => {
    await selectSinglesPlayers(user);
    await user.click(
      screen.getByRole("button", { name: (name) => name.startsWith(winnerName) }),
    );
  };

  const prepareDoublesMatch = async (
    user: ReturnType<typeof userEvent.setup>,
    winnerName: "Alice + Charlie" | "Bob + Dana" = "Alice + Charlie",
  ) => {
    await user.selectOptions(screen.getByLabelText(/team a - player 1/i), "player1");
    await user.selectOptions(screen.getByLabelText(/team a - player 2/i), "player3");
    await user.selectOptions(screen.getByLabelText(/team b - player 1/i), "player2");
    await user.selectOptions(screen.getByLabelText(/team b - player 2/i), "player4");
    await user.click(
      screen.getByRole("button", { name: (name) => name.startsWith(winnerName) }),
    );
  };

  beforeEach(() => {
    vi.mocked(useEvolu).mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof useEvolu>);
    vi.mocked(usePushNotifications).mockReturnValue({
      enqueueMatchNotification: mockEnqueueMatchNotification,
    } as unknown as ReturnType<typeof usePushNotifications>);
    vi.mocked(useLeagueData).mockReturnValue({
      players: mockPlayers,
      playersById: new Map(mockPlayers.map((p) => [p.id, p])),
      matches: [],
      ranking: [
        { player: mockPlayers[1], rating: 1180, delta: -20, matchCount: 5 },
        { player: mockPlayers[0], rating: 1050, delta: 50, matchCount: 3 },
        { player: mockPlayers[2], rating: 850, delta: 50, matchCount: 2 },
        { player: mockPlayers[3], rating: 920, delta: 0, matchCount: 1 },
      ],
    } as unknown as ReturnType<typeof useLeagueData>);
    mockInsert.mockClear();
    mockEnqueueMatchNotification.mockClear();
  });

  it("should render player selects with all players", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    // Check Player A and Player B selects exist
    expect(screen.getByLabelText(/player a/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/player b/i)).toBeInTheDocument();

    // Check that players are in the selects (appear in options)
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Charlie").length).toBeGreaterThanOrEqual(2);
  });

  it("should show message when fewer than 2 players", () => {
    render(
      <MatchRecorder players={[mockPlayers[0]]} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    expect(
      screen.getByText("Add at least two players to record a match.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record match/i })).not.toBeInTheDocument();
  });

  it("should initialize with no selected players or winner", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const playerSelects = screen.getAllByRole("combobox");
    expect(playerSelects[0]).toHaveValue("");
    expect(playerSelects[1]).toHaveValue("");
    expect(screen.queryByText("Projected change")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record match/i })).not.toBeInTheDocument();
  });

  it("should report singles selection changes", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <MatchRecorder
        players={mockPlayers}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(onSelectionChange).toHaveBeenCalledWith({
      mode: "singles",
      playerAId: "",
      playerBId: "",
    });

    await user.selectOptions(screen.getByLabelText(/player a/i), "player2");

    expect(onSelectionChange).toHaveBeenLastCalledWith({
      mode: "singles",
      playerAId: "player2",
      playerBId: "",
    });
  });

  it("preserves empty singles selection when the player roster changes", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <MatchRecorder
        players={mockPlayers.slice(0, 3)}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByLabelText(/player a/i)).toHaveValue("");
    expect(screen.getByLabelText(/player b/i)).toHaveValue("");

    rerender(
      <MatchRecorder
        players={mockPlayers.slice(1, 4)}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByLabelText(/player a/i)).toHaveValue("");
    expect(screen.getByLabelText(/player b/i)).toHaveValue("");
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      mode: "singles",
      playerAId: "",
      playerBId: "",
    });
  });

  it("reconciles singles selection when a selected player disappears", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <MatchRecorder
        players={mockPlayers.slice(0, 3)}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        onSelectionChange={onSelectionChange}
      />,
    );

    await selectSinglesPlayers(user);

    expect(screen.getByLabelText(/player a/i)).toHaveValue("player1");
    expect(screen.getByLabelText(/player b/i)).toHaveValue("player2");

    rerender(
      <MatchRecorder
        players={mockPlayers.slice(1, 4)}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByLabelText(/player a/i)).toHaveValue("player2");
    expect(screen.getByLabelText(/player b/i)).toHaveValue("player3");
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      mode: "singles",
      playerAId: "player2",
      playerBId: "player3",
    });
  });

  it("should display winner selection buttons for selected players", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await selectSinglesPlayers(user);

    const winnerButtons = screen.getAllByRole("button", { name: /Alice|Bob/i });
    expect(winnerButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("should highlight selected winner", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await selectSinglesPlayers(user);

    const aliceButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Alice")
    );
    const bobButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Bob")
    );

    expect(aliceButton).toBeInTheDocument();
    expect(bobButton).toBeInTheDocument();

    expect(screen.getAllByText(/^winner$/i)).toHaveLength(1);

    if (aliceButton) {
      await user.click(aliceButton);
      expect(aliceButton).toHaveStyle({ borderColor: "#F7931A" });
    }

    if (bobButton) await user.click(bobButton);

    await waitFor(() => {
      expect(bobButton).toHaveStyle({ borderColor: "#3B82F6" });
    });
  });

  it("should show projected change after choosing a winner", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);

    expect(screen.getByText("Projected change")).toBeInTheDocument();
  });

  it("should keep projected change visible when stronger side is selected as winner", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await selectSinglesPlayers(user);
    await user.click(screen.getByRole("button", { name: /bob/i }));
    expect(screen.getByText("Projected change")).toBeInTheDocument();
    expect(screen.queryByText("Upset replay")).not.toBeInTheDocument();
  });

  it("should submit match with correct data", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    expect(mockInsert).toHaveBeenCalledWith(
      "match",
      expect.objectContaining({
        playerAId: "player1",
        playerBId: "player2",
        winnerId: "player1",
        note: null,
      }),
      expect.any(Object)
    );
  });

  it("should clear opposite selector when selecting its current player", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const playerASelect = screen.getByLabelText(/player a/i);
    const playerBSelect = screen.getByLabelText(/player b/i);

    await user.selectOptions(playerASelect, "player1");
    await user.selectOptions(playerBSelect, "player2");

    expect(playerASelect).toHaveValue("player1");
    expect(playerBSelect).toHaveValue("player2");

    // Both players should be visible in both dropdowns
    expect(within(playerASelect).queryByRole("option", { name: "Bob" })).not.toBeNull();
    expect(within(playerBSelect).queryByRole("option", { name: "Alice" })).not.toBeNull();

    // Selecting Player B's current value in Player A should clear Player B
    await user.selectOptions(playerASelect, "player2");
    expect(playerASelect).toHaveValue("player2");
    expect(playerBSelect).toHaveValue("");
  });

  it("should include note when provided", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const noteInput = screen.getByPlaceholderText(/score, highlights/i);
    await user.type(noteInput, "Great game! 21-19");

    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    expect(mockInsert).toHaveBeenCalledWith(
      "match",
      expect.objectContaining({
        note: "Great game! 21-19",
      }),
      expect.any(Object)
    );
  });

  it("should reset form after successful submission", async () => {
    const user = userEvent.setup();
    let onCompleteCallback: (() => void) | undefined;

    mockInsert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        onCompleteCallback = options?.onComplete;
        return { ok: true };
      }
    );

    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const noteInput = screen.getByPlaceholderText(/score, highlights/i);
    await user.type(noteInput, "Test note");

    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    // Simulate onComplete callback
    if (onCompleteCallback) {
      onCompleteCallback();
    }

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /record match/i })).not.toBeInTheDocument();
    });
  });

  it("should enqueue push notification after successful insert completion", async () => {
    const user = userEvent.setup();
    let onCompleteCallback: (() => void) | undefined;

    mockInsert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        onCompleteCallback = options?.onComplete;
        return { ok: true };
      }
    );

    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    if (onCompleteCallback) onCompleteCallback();

    await waitFor(() => {
      expect(mockEnqueueMatchNotification).toHaveBeenCalledTimes(1);
      expect(mockEnqueueMatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          isDoubles: false,
          playerAName: "Alice",
          playerBName: "Bob",
          winnerName: "Alice",
          playerARating: expect.any(Number),
          playerBRating: expect.any(Number),
          playerARank: expect.any(Number),
          playerBRank: expect.any(Number),
        })
      );
      expect(screen.getByText("Match recorded.")).toBeInTheDocument();
    });
  });

  it("should support doubles selection and insert doubles match fields", async () => {
    const user = userEvent.setup();

    render(
      <MatchRecorder
        players={mockPlayers}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        mode="doubles"
      />
    );

    await prepareDoublesMatch(user);

    expect(screen.getByRole("button", { name: /alice \+ charlie/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bob \+ dana/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /record match/i }));

    expect(mockInsert).toHaveBeenCalledWith(
      "match",
      expect.objectContaining({
        playerAId: "player1",
        playerBId: "player2",
        playerA2Id: "player3",
        playerB2Id: "player4",
        winnerId: "player1",
        winnerTeam: "A",
      }),
      expect.any(Object),
    );
  });

  it("should report doubles selection changes", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <MatchRecorder
        players={mockPlayers}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        mode="doubles"
        onSelectionChange={onSelectionChange}
      />
    );

    expect(onSelectionChange).toHaveBeenCalledWith({
      mode: "doubles",
      playerAId: "",
      playerA2Id: "",
      playerBId: "",
      playerB2Id: "",
    });

    await user.selectOptions(screen.getByLabelText(/team a - player 1/i), "player1");
    await user.selectOptions(screen.getByLabelText(/team a - player 2/i), "player3");
    await user.selectOptions(screen.getByLabelText(/team b - player 1/i), "player2");
    await user.selectOptions(screen.getByLabelText(/team b - player 2/i), "player4");

    expect(onSelectionChange).toHaveBeenLastCalledWith({
      mode: "doubles",
      playerAId: "player1",
      playerA2Id: "player3",
      playerBId: "player2",
      playerB2Id: "player4",
    });
  });

  it("should enqueue doubles push notification with all team names", async () => {
    const user = userEvent.setup();
    let onCompleteCallback: (() => void) | undefined;

    mockInsert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        onCompleteCallback = options?.onComplete;
        return { ok: true };
      },
    );

    render(
      <MatchRecorder
        players={mockPlayers}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        mode="doubles"
      />
    );

    await prepareDoublesMatch(user, "Bob + Dana");
    await user.click(screen.getByRole("button", { name: /record match/i }));

    if (onCompleteCallback) onCompleteCallback();

    await waitFor(() => {
      expect(mockEnqueueMatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          isDoubles: true,
          playerAName: "Alice + Charlie",
          playerBName: "Bob + Dana",
          winnerName: "Bob + Dana",
        }),
      );
    });
  });

  it("should show team column layout in doubles mode", () => {
    render(
      <MatchRecorder
        players={mockPlayers}
        currentRatings={mockCurrentRatings}
        matches={mockMatches}
        mode="doubles"
      />
    );

    expect(screen.queryByText("Second players")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/team a - player 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/team a - player 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/team b - player 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/team b - player 2/i)).toBeInTheDocument();
  });

  it("should display error when validation fails", async () => {
    const user = userEvent.setup();
    mockInsert.mockReturnValue({
      ok: false,
      error: { type: "ValidationError" },
    } as { ok: false; error: { type: string } });

    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: ValidationError/)).toBeInTheDocument();
    });
    expect(mockEnqueueMatchNotification).not.toHaveBeenCalled();
    expect(screen.queryByText("Match recorded.")).not.toBeInTheDocument();
  });

  it("should show projected change and no upset replay for equal ratings", async () => {
    const user = userEvent.setup();
    const equalRatingsMap = new Map<PlayerId, number>([
      ["player1" as PlayerId, 1000],
      ["player2" as PlayerId, 1000],
    ]);

    render(
      <MatchRecorder players={mockPlayers.slice(0, 2)} currentRatings={equalRatingsMap} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    expect(screen.getByText("Projected change")).toBeInTheDocument();
    expect(screen.queryByText("Upset replay")).not.toBeInTheDocument();
  });

  it("should show winner label on selected winner button", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const winnerLabels = screen.getAllByText(/winner/i);
    expect(winnerLabels.length).toBeGreaterThan(0);
  });

  it("should allow textarea input up to 1000 characters", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    await prepareSinglesMatch(user);
    const noteInput = screen.getByPlaceholderText(/score, highlights/i);
    expect(noteInput).toHaveAttribute("maxlength", "1000");
  });
});
