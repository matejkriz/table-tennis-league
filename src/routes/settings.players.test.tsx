import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    readonly children: React.ReactNode;
    readonly to: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} href={to}>{children}</a>,
  createFileRoute: () => (options: unknown) => options,
}));

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("../evolu/client", () => ({
  allPlayersQuery: { toString: () => "all-player" },
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
  useEvolu: () => ({
    insert: mockInsert,
    update: mockUpdate,
  }),
  useQuery: () => mockUseQuery(),
}));

import { PlayerManagementPage } from "./settings.players";
import { createMockPlayer } from "../test/helpers";
import type { PlayerId } from "../evolu/client";

describe("PlayerManagementPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString();

    mockUseQuery.mockReturnValue([
      createMockPlayer({
        id: "player1" as PlayerId,
        name: "Alice",
        initialRating: 1000,
      }),
      createMockPlayer({
        id: "player2" as PlayerId,
        name: "Bob",
        initialRating: 980,
        deletedAt: threeDaysAgo,
      }),
      createMockPlayer({
        id: "player3" as PlayerId,
        name: "Carol",
        initialRating: 970,
        deletedAt: fortyDaysAgo,
      }),
    ]);
    mockInsert.mockReturnValue({ ok: true });
    mockUpdate.mockReturnValue({ ok: true });
  });

  it("shows active players and only recently deleted players", () => {
    render(<PlayerManagementPage />);

    expect(screen.getByRole("button", { name: "Add player" })).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("removes recently deleted players when their retention window expires while the page stays open", async () => {
    vi.useFakeTimers();

    const now = new Date("2026-03-08T12:00:00.000Z");
    vi.setSystemTime(now);

    mockUseQuery.mockReturnValue([
      createMockPlayer({
        id: "player1" as PlayerId,
        name: "Alice",
        initialRating: 1000,
      }),
      createMockPlayer({
        id: "player2" as PlayerId,
        name: "Bob",
        initialRating: 980,
        deletedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 1000).toISOString(),
      }),
    ]);

    render(<PlayerManagementPage />);

    expect(screen.getByText("Bob")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001);
    });

    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("pluralizes the active player count badge", () => {
    render(<PlayerManagementPage />);

    expect(screen.getByText("1 player")).toBeInTheDocument();
  });

  it("renames an active player inline", async () => {
    const user = userEvent.setup();

    render(<PlayerManagementPage />);

    await user.click(screen.getByRole("button", { name: "Edit Alice" }));
    const input = screen.getByDisplayValue("Alice");
    await user.clear(input);
    await user.type(input, "Alice A");
    await user.click(screen.getByRole("button", { name: "Save Alice" }));

    expect(mockUpdate).toHaveBeenCalledWith("player", {
      id: "player1",
      name: "Alice A",
    });
  });

  it("soft deletes an active player immediately", async () => {
    const user = userEvent.setup();

    render(<PlayerManagementPage />);

    await user.click(screen.getByRole("button", { name: "Delete Alice" }));

    expect(mockUpdate).toHaveBeenCalledWith(
      "player",
      expect.objectContaining({
        id: "player1",
        isDeleted: 1,
      }),
    );
  });

  it("restores a deleted player", async () => {
    const user = userEvent.setup();

    render(<PlayerManagementPage />);

    await user.click(screen.getByRole("button", { name: "Restore Bob" }));

    expect(mockUpdate).toHaveBeenCalledWith("player", {
      id: "player2",
      isDeleted: 0,
      deletedAt: null,
    });
  });
});
