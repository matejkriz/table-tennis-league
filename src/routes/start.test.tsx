import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUseEvolu = vi.fn();
const mockUseQuery = vi.fn();
const mockUseLeagueData = vi.fn();
const mockHtml5QrcodeStart = vi.fn((..._args: unknown[]) => Promise.resolve(null));
const mockHtml5QrcodeStop = vi.fn((..._args: unknown[]) => Promise.resolve());
const mockHtml5QrcodeClear = vi.fn((..._args: unknown[]) => undefined);
let lastScanSuccess: ((decodedText: string) => void) | null = null;

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

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

vi.mock("html5-qrcode", () => ({
  Html5QrcodeSupportedFormats: {
    QR_CODE: 0,
  },
  Html5Qrcode: class {
    public isScanning = false;

    public start = (
      ...args: [unknown, unknown, (decodedText: string) => void, unknown]
    ) => {
      this.isScanning = true;
      lastScanSuccess = args[2];
      return mockHtml5QrcodeStart(...args);
    };

    public stop = (...args: unknown[]) => {
      this.isScanning = false;
      return mockHtml5QrcodeStop(...args);
    };

    public clear = (...args: unknown[]) => mockHtml5QrcodeClear(...args);
  },
}));

import { encodeMnemonicShareToken } from "../utils/mnemonicShare";
import { StartPage } from "./start";

describe("StartPage", () => {
  const insert = vi.fn(
    (_table: string, _data: unknown, _options?: { onComplete?: () => void }) =>
      ({ ok: true as boolean })
  );
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
    lastScanSuccess = null;

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

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("renders share controls and fixed-rating player form in startup mode without share param", async () => {
    await renderPage();

    expect(await screen.findByTestId("qr-code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan QR code" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Initial rating")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("League name")).not.toBeInTheDocument();
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

  it("auto-imports a shared league from the URL and asks user to add themselves", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    window.history.replaceState({}, "", `/start?share=${encoded.value}`);

    await renderPage();

    await waitFor(() => {
      expect(restoreAppOwner).toHaveBeenCalledWith(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      );
    });
    expect(await screen.findByText("Add yourself to this league")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load shared league" })).not.toBeInTheDocument();
  });

  it("adds player with fixed 1000 rating and redirects after share flow", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    window.history.replaceState({}, "", `/start?share=${encoded.value}`);
    insert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        options?.onComplete?.();
        return { ok: true };
      }
    );

    const user = userEvent.setup();
    await renderPage();

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

  it("starts camera scanning on coarse-pointer devices and restores after scan", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Scan QR code" }));

    expect(mockHtml5QrcodeStart).toHaveBeenCalledTimes(1);
    expect(lastScanSuccess).not.toBeNull();
    await act(async () => {
      lastScanSuccess?.(`https://example.com/start?share=${encoded.value}`);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(restoreAppOwner).toHaveBeenCalledWith(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      );
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
