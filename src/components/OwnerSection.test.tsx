import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { encodeMnemonicShareToken } from "../utils/mnemonicShare";

const mockUseEvolu = vi.fn();
const mockUseQuery = vi.fn();

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
  });

  it("renders share input and QR code when mnemonic and league name are available", async () => {
    renderSection();

    expect(await screen.findByLabelText("League name")).toHaveValue("my league");
    expect(await screen.findByTestId("qr-code")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Copy share link" })
    ).toBeInTheDocument();
  });

  it("shows import panel when share query param exists", async () => {
    window.history.replaceState({}, "", "/settings?share=test-token");
    renderSection();

    expect(await screen.findByText("Shared league link detected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load shared league" })).toBeInTheDocument();
  });

  it("restores app owner and clears share param on successful import", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      leagueName: "my league",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    window.history.replaceState({}, "", `/settings?share=${encoded.value}`);
    mockUseQuery.mockReturnValue([]);

    const user = userEvent.setup();
    renderSection();

    const input = await screen.findByLabelText("League name");
    await user.type(input, "my league");
    await user.click(screen.getByRole("button", { name: "Load shared league" }));

    await waitFor(() => {
      expect(restoreAppOwner).toHaveBeenCalledWith(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      );
    });
    expect(window.location.search).toBe("");
  });

  it("shows inline error and does not restore on invalid decryption", async () => {
    const encoded = await encodeMnemonicShareToken({
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      leagueName: "correct league",
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    window.history.replaceState({}, "", `/settings?share=${encoded.value}`);
    mockUseQuery.mockReturnValue([]);
    const user = userEvent.setup();

    renderSection();

    const input = await screen.findByLabelText("League name");
    await user.type(input, "wrong league");
    await user.click(screen.getByRole("button", { name: "Load shared league" }));

    await waitFor(() => {
      expect(
        screen.getByText("Could not decrypt shared league. Check league name.")
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
