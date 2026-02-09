import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Evolu before any imports that use it
vi.mock("../evolu/client", () => ({
  useEvolu: vi.fn(),
  useQuery: vi.fn(() => []),
  uiPreferencesQuery: {},
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
}));
vi.mock("../hooks/usePushNotifications", () => ({
  usePushNotifications: vi.fn(),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerId, MatchRow } from "../evolu/client";
import { useEvolu } from "../evolu/client";
import { usePushNotifications } from "../hooks/usePushNotifications";
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
  ];

  const mockCurrentRatings = new Map<PlayerId, number>([
    ["player1" as PlayerId, 1050],
    ["player2" as PlayerId, 1180],
    ["player3" as PlayerId, 850],
  ]);

  const mockMatches: MatchRow[] = [];

  const mockInsert = vi.fn<
    (table: string, data: unknown, options?: { onComplete?: () => void }) => InsertResult
  >(() => ({ ok: true }));
  const mockEnqueueMatchNotification = vi.fn();

  beforeEach(() => {
    vi.mocked(useEvolu).mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof useEvolu>);
    vi.mocked(usePushNotifications).mockReturnValue({
      enqueueMatchNotification: mockEnqueueMatchNotification,
    } as unknown as ReturnType<typeof usePushNotifications>);
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

  it("should initialize with first two players selected", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const playerSelects = screen.getAllByRole("combobox");
    expect(playerSelects[0]).toHaveValue("player1");
    expect(playerSelects[1]).toHaveValue("player2");
  });

  it("should display winner selection buttons for selected players", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const winnerButtons = screen.getAllByRole("button", { name: /Alice|Bob/i });
    expect(winnerButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("should highlight selected winner", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const aliceButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Alice")
    );
    const bobButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Bob")
    );

    expect(aliceButton).toBeInTheDocument();
    expect(bobButton).toBeInTheDocument();

    // Alice (Player A) should be selected by default - orange color (inline style)
    expect(aliceButton).toHaveStyle({ borderColor: "#F7931A" });

    // Click Bob to select as winner
    if (bobButton) await user.click(bobButton);

    // Bob (Player B) should now be highlighted - blue color (inline style)
    await waitFor(() => {
      expect(bobButton).toHaveStyle({ borderColor: "#3B82F6" });
    });
  });

  it("should show projected rating changes", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    expect(screen.getByText("Projected change")).toBeInTheDocument();
    // Should show current ratings and deltas
    expect(screen.getByText(/1050/)).toBeInTheDocument(); // Alice's rating
    expect(screen.getByText(/1180/)).toBeInTheDocument(); // Bob's rating
  });

  it("should submit match with correct data", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    expect(mockInsert).toHaveBeenCalledWith(
      "match",
      expect.objectContaining({
        playerAId: "player1",
        playerBId: "player2",
        winnerId: "player1", // Default winner is first player
        note: null,
      }),
      expect.any(Object)
    );
  });

  it("should prevent selecting the same player twice", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const playerASelect = screen.getByLabelText(/player a/i);
    const playerBSelect = screen.getByLabelText(/player b/i);

    // Initially: Alice vs Bob
    expect(playerASelect).toHaveValue("player1");
    expect(playerBSelect).toHaveValue("player2");

    // When we select Bob for Player A, Player B should automatically change
    await user.selectOptions(playerASelect, "player2");

    // Player B should now be different (not Bob)
    await waitFor(() => {
      expect(playerBSelect).not.toHaveValue("player2");
    });
  });

  it("should include note when provided", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

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

    const noteInput = screen.getByPlaceholderText(/score, highlights/i);
    await user.type(noteInput, "Test note");

    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    // Simulate onComplete callback
    if (onCompleteCallback) {
      onCompleteCallback();
    }

    await waitFor(() => {
      expect(noteInput).toHaveValue("");
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

    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    if (onCompleteCallback) onCompleteCallback();

    await waitFor(() => {
      expect(mockEnqueueMatchNotification).toHaveBeenCalledTimes(1);
      expect(mockEnqueueMatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          playerAName: "Alice",
          playerBName: "Bob",
          winnerName: "Alice",
        })
      );
    });
  });

  it("should change player B when player A is changed to same value", async () => {
    const user = userEvent.setup();
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const playerSelects = screen.getAllByRole("combobox");

    // Initially: Alice vs Bob
    expect(playerSelects[0]).toHaveValue("player1");
    expect(playerSelects[1]).toHaveValue("player2");

    // Change player A to Bob (same as player B)
    await user.selectOptions(playerSelects[0], "player2");

    // Player B should automatically change to avoid duplicate
    await waitFor(() => {
      expect(playerSelects[1]).not.toHaveValue("player2");
    });
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

    const submitButton = screen.getByRole("button", { name: /record match/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: ValidationError/)).toBeInTheDocument();
    });
    expect(mockEnqueueMatchNotification).not.toHaveBeenCalled();
  });

  it("should calculate correct delta for equal ratings", () => {
    const equalRatingsMap = new Map<PlayerId, number>([
      ["player1" as PlayerId, 1000],
      ["player2" as PlayerId, 1000],
    ]);

    render(
      <MatchRecorder players={mockPlayers.slice(0, 2)} currentRatings={equalRatingsMap} matches={mockMatches} />
    );

    // For equal ratings, expected score is 0.5 for each
    // Winner gets: 16 * (1 - 0.5) = +8
    // Loser gets: 16 * (0 - 0.5) = -8
    expect(screen.getByText(/\+8\.0/)).toBeInTheDocument();
    expect(screen.getByText(/-8\.0/)).toBeInTheDocument();
  });

  it("should show winner label on selected winner button", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    // First player (Alice) is default winner
    const winnerLabels = screen.getAllByText(/winner/i);
    expect(winnerLabels.length).toBeGreaterThan(0);
  });

  it("should allow textarea input up to 1000 characters", () => {
    render(
      <MatchRecorder players={mockPlayers} currentRatings={mockCurrentRatings} matches={mockMatches} />
    );

    const noteInput = screen.getByPlaceholderText(/score, highlights/i);
    expect(noteInput).toHaveAttribute("maxlength", "1000");
  });
});
