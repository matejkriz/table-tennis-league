import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import packageJson from "../../package.json";

vi.stubGlobal("__APP_VERSION__", packageJson.version);

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div>Settings child route</div>,
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

vi.mock("../components/CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    children,
  }: {
    readonly title: string;
    readonly children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock("../components/DoublesModeSetting", () => ({
  DoublesModeSetting: () => <div>Doubles setting</div>,
}));

vi.mock("../components/LanguageSelector", () => ({
  LanguageSelector: () => <div>Language selector</div>,
}));

vi.mock("../components/OwnerSection", () => ({
  OwnerSection: () => <div>Owner section</div>,
}));

vi.mock("../components/PushNotificationsSection", () => ({
  PushNotificationsSection: () => <div>Push notifications section</div>,
}));

vi.mock("../hooks/useLeagueData", () => ({
  useLeagueData: () => ({
    players: [{ id: "player-1" }, { id: "player-2" }],
    matches: [{ match: { id: "match-1" } }],
    ranking: [],
    playersById: new Map(),
  }),
}));

import { SettingsPage } from "./settings.index";
import { SettingsLayout } from "./settings";

describe("SettingsPage", () => {
  it("links to the player-management subpage", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("link", { name: "Edit players" })).toHaveAttribute(
      "href",
      "/settings/players",
    );
  });

  it("no longer shows the add-player section on the main settings page", () => {
    render(<SettingsPage />);

    expect(screen.queryByText("Add player")).not.toBeInTheDocument();
  });

  it("shows the package version at the end of the page", () => {
    render(<SettingsPage />);

    expect(
      screen.getByText(`Version ${packageJson.version}`),
    ).toBeInTheDocument();
  });

  it("renders nested settings routes through the layout outlet", () => {
    render(<SettingsLayout />);

    expect(screen.getByText("Settings child route")).toBeInTheDocument();
  });
});
