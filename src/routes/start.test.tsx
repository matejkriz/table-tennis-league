import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUseEvolu = vi.fn();
const mockUseQuery = vi.fn();
const mockUseLeagueData = vi.fn();
const mockDecodeMnemonicShareToken = vi.fn();
const mockEncodeMnemonicShareToken = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../evolu/client", () => ({
  leagueSettingsQuery: {},
  LeagueSettingId: {},
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
  useEvolu: () => mockUseEvolu(),
  useQuery: () => mockUseQuery(),
}));

vi.mock("../hooks/useLeagueData", () => ({
  useLeagueData: () => mockUseLeagueData(),
}));

vi.mock("../utils/mnemonicShare", async () => {
  const actual = await vi.importActual<typeof import("../utils/mnemonicShare")>(
    "../utils/mnemonicShare"
  );
  return {
    ...actual,
    encodeMnemonicShareToken: (...args: unknown[]) =>
      mockEncodeMnemonicShareToken(...args),
    decodeMnemonicShareToken: (...args: unknown[]) =>
      mockDecodeMnemonicShareToken(...args),
  };
});

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

import { StartPage } from "./start";

describe("StartPage", () => {
  const insert = vi.fn(() => ({ ok: true }));
  const update = vi.fn(() => ({ ok: true }));
  const restoreAppOwner = vi.fn();

  const renderPage = async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading…</div>}>
          <StartPage />
        </Suspense>
      );
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/start");

    const appOwnerValue = {
      id: "owner-1",
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    };

    mockUseEvolu.mockReturnValue({
      appOwner: Promise.resolve(appOwnerValue),
      insert,
      update,
      restoreAppOwner,
    });

    mockUseQuery.mockReturnValue([
      {
        id: "setting-1",
        key: "share-league-name",
        value: "my league",
      },
    ]);

    mockUseLeagueData.mockReturnValue({
      players: [],
      matches: [],
      ranking: [],
      playersById: new Map(),
    });

    mockEncodeMnemonicShareToken.mockResolvedValue({ ok: true, value: "token-1" });
    mockDecodeMnemonicShareToken.mockResolvedValue({
      ok: true,
      value:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
  });

  it("renders share controls and fixed-rating player form in startup mode without share param", async () => {
    await renderPage();

    expect(await screen.findByLabelText("League name")).toBeInTheDocument();
    expect(await screen.findByTestId("qr-code")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Initial rating")).not.toBeInTheDocument();
  });

  it("redirects to / when /start is visited without share param and startup is complete", async () => {
    mockUseLeagueData.mockReturnValue({
      players: [{ id: "p1" }, { id: "p2" }],
      matches: [],
      ranking: [],
      playersById: new Map(),
    });

    await renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("asks for league name immediately when share param exists", async () => {
    window.history.replaceState({}, "", "/start?share=abc");

    await renderPage();

    expect(await screen.findByText("Shared league link detected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load shared league" })).toBeInTheDocument();
  });

  it("shows retry error when share decrypt fails", async () => {
    window.history.replaceState({}, "", "/start?share=abc");
    mockDecodeMnemonicShareToken.mockResolvedValue({
      ok: false,
      error: { type: "DecryptionFailed" },
    });

    const user = userEvent.setup();
    await renderPage();

    await user.type(await screen.findByLabelText("League name"), "wrong");
    await user.click(screen.getByRole("button", { name: "Load shared league" }));

    expect(
      await screen.findByText("Could not decrypt shared league. Check league name.")
    ).toBeInTheDocument();
    expect(restoreAppOwner).not.toHaveBeenCalled();
  });

  it("loads share and then asks user to add themselves", async () => {
    window.history.replaceState({}, "", "/start?share=abc");
    const user = userEvent.setup();

    await renderPage();

    await user.type(await screen.findByLabelText("League name"), "my league");
    await user.click(screen.getByRole("button", { name: "Load shared league" }));

    await waitFor(() => {
      expect(restoreAppOwner).toHaveBeenCalled();
    });
    expect(await screen.findByText("Add yourself to this league")).toBeInTheDocument();
  });

  it("adds player with fixed 1000 rating and redirects after share flow", async () => {
    window.history.replaceState({}, "", "/start?share=abc");
    insert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        options?.onComplete?.();
        return { ok: true };
      }
    );

    const user = userEvent.setup();
    await renderPage();

    await user.type(await screen.findByLabelText("League name"), "my league");
    await user.click(screen.getByRole("button", { name: "Load shared league" }));

    await user.type(await screen.findByLabelText("Your name"), "Alice");
    await user.click(screen.getByRole("button", { name: "Add yourself and continue" }));

    expect(insert).toHaveBeenCalledWith(
      "player",
      { name: "Alice", initialRating: 1000 },
      expect.any(Object)
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("redirects after adding second player in no-share mode", async () => {
    mockUseLeagueData.mockReturnValue({
      players: [{ id: "p1", name: "One", initialRating: 1000 }],
      matches: [],
      ranking: [],
      playersById: new Map(),
    });

    insert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        options?.onComplete?.();
        return { ok: true };
      }
    );

    const user = userEvent.setup();
    await renderPage();

    await user.type(await screen.findByLabelText("Your name"), "Two");
    await user.click(screen.getByRole("button", { name: "Add player" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });
});
