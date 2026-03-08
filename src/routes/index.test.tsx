import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock("../components/CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    children,
    defaultOpen,
    isOpen,
    onToggle,
  }: {
    readonly title: string;
    readonly children: ReactNode;
    readonly defaultOpen: boolean;
    readonly isOpen?: boolean;
    readonly onToggle?: () => void;
  }) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const open = isOpen ?? internalOpen;

    const handleToggle = () => {
      if (onToggle) {
        onToggle();
        return;
      }

      setInternalOpen((current) => !current);
    };

    return (
      <section>
        <button type="button" onClick={handleToggle}>
          {title}
        </button>
        {open ? <div>{children}</div> : null}
      </section>
    );
  },
}));

vi.mock("../components/MatchRecorder", () => ({
  MatchRecorder: ({
    mode = "singles",
    onSelectionChange,
  }: {
    readonly mode?: "singles" | "doubles";
    readonly onSelectionChange?: (selection: unknown) => void;
  }) => {
    useEffect(() => {
      if (!onSelectionChange) return;
      if (mode === "doubles") {
        onSelectionChange({
          mode: "doubles",
          playerAId: "player1",
          playerA2Id: "player3",
          playerBId: "player2",
          playerB2Id: "player4",
        });
        return;
      }

      onSelectionChange({
        mode: "singles",
        playerAId: "player1",
        playerBId: "player2",
      });
    }, [mode, onSelectionChange]);

    return <div>{mode === "doubles" ? "Doubles recorder" : "Singles recorder"}</div>;
  },
}));

vi.mock("../components/DuelsHistory", () => ({
  DuelsHistory: ({ activeSelection }: { readonly activeSelection: unknown }) => (
    <pre data-testid="duels-selection">{JSON.stringify(activeSelection)}</pre>
  ),
}));

vi.mock("../components/RankingList", () => ({
  RankingList: () => <div>Ranking list</div>,
}));

vi.mock("../hooks/useCollapsibleState", () => ({
  useCollapsibleState: (_key: string, defaultOpen: boolean) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const toggle = () => setIsOpen((current) => !current);
    return [isOpen, toggle, setIsOpen] as const;
  },
}));

vi.mock("../hooks/useDoublesPreference", () => ({
  useDoublesPreference: vi.fn(),
}));

vi.mock("../hooks/useLeagueData", () => ({
  useLeagueData: vi.fn(),
}));

vi.mock("../utils/startAccess", () => ({
  shouldRedirectRootToStart: vi.fn(() => false),
}));

import { useDoublesPreference } from "../hooks/useDoublesPreference";
import { useLeagueData } from "../hooks/useLeagueData";
import { MatchPage } from "./index";

describe("MatchPage", () => {
  beforeEach(() => {
    vi.mocked(useDoublesPreference).mockReturnValue([true, vi.fn()]);
    vi.mocked(useLeagueData).mockReturnValue({
      players: [
        { id: "player1", name: "Alice", initialRating: 1000 },
        { id: "player2", name: "Bob", initialRating: 1000 },
        { id: "player3", name: "Charlie", initialRating: 1000 },
        { id: "player4", name: "Dana", initialRating: 1000 },
      ],
      playersById: new Map(),
      matches: [],
      ranking: [],
    } as unknown as ReturnType<typeof useLeagueData>);
  });

  it("keeps exactly one recorder section open and switches the active duels source", async () => {
    const user = userEvent.setup();

    render(<MatchPage />);
    await user.click(screen.getByRole("button", { name: "Duels" }));

    expect(screen.getByText("Singles recorder")).toBeInTheDocument();
    expect(screen.queryByText("Doubles recorder")).not.toBeInTheDocument();
    expect(screen.getByTestId("duels-selection")).toHaveTextContent('"mode":"singles"');

    await user.click(screen.getByRole("button", { name: "Record doubles match" }));

    expect(screen.queryByText("Singles recorder")).not.toBeInTheDocument();
    expect(screen.getByText("Doubles recorder")).toBeInTheDocument();
    expect(screen.getByTestId("duels-selection")).toHaveTextContent('"mode":"doubles"');

    await user.click(screen.getByRole("button", { name: "Record match" }));

    expect(screen.getByText("Singles recorder")).toBeInTheDocument();
    expect(screen.queryByText("Doubles recorder")).not.toBeInTheDocument();
    expect(screen.getByTestId("duels-selection")).toHaveTextContent('"mode":"singles"');
  });
});
