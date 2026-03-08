import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { encodeMnemonicShareToken } from "../utils/mnemonicShare";

const mockUseEvolu = vi.fn();
const mockUseQuery = vi.fn();
const mockHtml5QrcodeStart = vi.fn((..._args: unknown[]) => Promise.resolve(null));
const mockHtml5QrcodeStop = vi.fn((..._args: unknown[]) => Promise.resolve());
const mockHtml5QrcodeClear = vi.fn((..._args: unknown[]) => undefined);
const mockHtml5QrcodeScanFile = vi.fn((..._args: unknown[]) => Promise.resolve(""));

vi.mock("../evolu/client", () => ({
  authResult: { username: "Test User" },
  ownerProfiles: [{ id: "profile-1" }],
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
  leagueSettingsQuery: {},
  useEvolu: () => mockUseEvolu(),
  useQuery: () => mockUseQuery(),
}));

vi.mock("@evolu/react-web", () => ({
  EvoluIdenticon: ({ id }: { id: string }) => <div data-testid="identicon">{id}</div>,
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

    public start = (...args: unknown[]) => {
      this.isScanning = true;
      return mockHtml5QrcodeStart(...args);
    };

    public stop = (...args: unknown[]) => {
      this.isScanning = false;
      return mockHtml5QrcodeStop(...args);
    };

    public clear = (...args: unknown[]) => mockHtml5QrcodeClear(...args);

    public scanFile = (...args: unknown[]) => mockHtml5QrcodeScanFile(...args);
  },
}));

import { OwnerSection } from "./OwnerSection";

describe("OwnerSection share/import", () => {
  const restoreAppOwner = vi.fn();
  const insert = vi.fn(() => ({ ok: true }));
  const update = vi.fn(() => ({ ok: true }));

  const renderSection = () =>
    render(
      <Suspense fallback={<div>Loading…</div>}>
        <OwnerSection />
      </Suspense>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/settings");

    const appOwnerValue = {
      id: "owner-1",
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    };

    const appOwner = {
      status: "fulfilled" as const,
      value: appOwnerValue,
      then: (resolve: (value: typeof appOwnerValue) => void) =>
        Promise.resolve(resolve(appOwnerValue)),
    };

    mockUseEvolu.mockReturnValue({
      appOwner,
      restoreAppOwner,
      insert,
      update,
      exportDatabase: vi.fn(() => Promise.resolve(new Uint8Array())),
      resetAppOwner: vi.fn(),
    });

    mockUseQuery.mockReturnValue([
      {
        id: "setting-1",
        key: "share-league-name",
        value: "my league",
      },
    ]);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
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

  it("renders QR share controls without the league name field", async () => {
    renderSection();

    expect(await screen.findByTestId("qr-code")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Copy share link" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan QR code" })).toBeInTheDocument();
    expect(screen.queryByLabelText("League name")).not.toBeInTheDocument();
  });

  it("opens desktop scanner with file import instead of camera preview", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Scan QR code" }));

    expect(screen.getByText("Upload QR image")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose QR image")).toBeInTheDocument();
    expect(mockHtml5QrcodeStart).not.toHaveBeenCalled();
  });

  it("restores app owner from a scanned QR image file", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    mockHtml5QrcodeScanFile.mockResolvedValue(
      `https://example.com/start?share=${encoded.value}`
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Scan QR code" }));
    const fileInput = screen.getByLabelText("Choose QR image");
    await user.upload(fileInput, new File(["qr"], "share.png", { type: "image/png" }));

    await waitFor(() => {
      expect(restoreAppOwner).toHaveBeenCalledWith(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      );
    });
  });

  it("shows inline error and does not restore when scanned file is not a share URL", async () => {
    mockHtml5QrcodeScanFile.mockResolvedValue("https://example.com/not-a-share");
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Scan QR code" }));
    const fileInput = screen.getByLabelText("Choose QR image");
    await user.upload(fileInput, new File(["qr"], "invalid.png", { type: "image/png" }));

    await waitFor(() => {
      expect(
        screen.getByText("Scanned QR code does not contain a valid share link.")
      ).toBeInTheDocument();
    });
    expect(restoreAppOwner).not.toHaveBeenCalled();
  });

  it("copies generated share link to clipboard", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
    renderSection();

    const copyButton = await screen.findByRole("button", { name: "Copy share link" });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });

    const copiedValue = writeTextSpy.mock.calls[0]?.[0];
    expect(copiedValue).toContain("/start?share=");
  });
});
