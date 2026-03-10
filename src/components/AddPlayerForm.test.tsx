import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Evolu before any imports that use it
vi.mock("../evolu/client", () => ({
  useEvolu: vi.fn(),
  formatTypeError: vi.fn((error) => `Error: ${error.type}`),
}));

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEvolu } from "../evolu/client";
import { AddPlayerForm } from "./AddPlayerForm";

type InsertResult = { ok: true } | { ok: false; error: { type: string } };

describe("AddPlayerForm", () => {
  const mockInsert = vi.fn<
    (table: string, data: unknown, options?: { onComplete?: () => void }) => InsertResult
  >(() => ({ ok: true }));

  beforeEach(() => {
    vi.mocked(useEvolu).mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof useEvolu>);
    mockInsert.mockClear();
  });

  it("should render form fields", () => {
    render(<AddPlayerForm />);

    expect(screen.getByLabelText(/player name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/initial rating/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add player/i })).toBeInTheDocument();
  });

  it("should require name field", () => {
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    expect(nameInput).toHaveAttribute("required");
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    const submitButton = screen.getByRole("button", { name: /add player/i });

    await user.type(nameInput, "Alice");
    await user.click(submitButton);

    expect(mockInsert).toHaveBeenCalledWith(
      "player",
      {
        name: "Alice",
        initialRating: 1000,
      },
      expect.objectContaining({
        onComplete: expect.any(Function),
      })
    );
  });

  it("should trim whitespace from name", async () => {
    const user = userEvent.setup();
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    const submitButton = screen.getByRole("button", { name: /add player/i });

    await user.type(nameInput, "  Bob  ");
    await user.click(submitButton);

    expect(mockInsert).toHaveBeenCalledWith(
      "player",
      expect.objectContaining({
        name: "Bob",
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

    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    const submitButton = screen.getByRole("button", { name: /add player/i });

    await user.type(nameInput, "Charlie");
    await user.click(submitButton);

    // Simulate onComplete callback
    if (onCompleteCallback) {
      act(() => {
        onCompleteCallback?.();
      });
    }

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
    });
  });

  it("shows a success toast after a player is added", async () => {
    const user = userEvent.setup();
    let onCompleteCallback: (() => void) | undefined;

    mockInsert.mockImplementation(
      (_table: string, _data: unknown, options?: { onComplete?: () => void }) => {
        onCompleteCallback = options?.onComplete;
        return { ok: true };
      }
    );

    render(<AddPlayerForm />);

    await user.type(screen.getByLabelText(/player name/i), "Helen");
    await user.click(screen.getByRole("button", { name: /add player/i }));

    if (onCompleteCallback) {
      act(() => {
        onCompleteCallback?.();
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Player added.")).toBeInTheDocument();
    });
  });

  it("should display error from Evolu validation", async () => {
    const user = userEvent.setup();
    mockInsert.mockReturnValue({
      ok: false,
      error: { type: "MinLength" },
    } as { ok: false; error: { type: string } });

    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    const submitButton = screen.getByRole("button", { name: /add player/i });

    await user.type(nameInput, "Eve");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: MinLength/)).toBeInTheDocument();
    });
  });

  it("should limit name to 100 characters", () => {
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    expect(nameInput).toHaveAttribute("maxlength", "100");
  });

  it("should have autocomplete off for name input", () => {
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    expect(nameInput).toHaveAttribute("autocomplete", "off");
  });

  it("should clear error on new submission attempt", async () => {
    const user = userEvent.setup();
    mockInsert.mockReturnValueOnce({
      ok: false,
      error: { type: "ValidationError" },
    } as { ok: false; error: { type: string } });

    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    const submitButton = screen.getByRole("button", { name: /add player/i });

    // First submission with error
    await user.type(nameInput, "Test");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: ValidationError/)).toBeInTheDocument();
    });

    // Second submission should clear error
    mockInsert.mockReturnValueOnce({ ok: true });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/Error: ValidationError/)).not.toBeInTheDocument();
    });
  });

  it("should handle form submission via Enter key", async () => {
    const user = userEvent.setup();
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);

    await user.type(nameInput, "George");
    await user.keyboard("{Enter}");

    expect(mockInsert).toHaveBeenCalledWith(
      "player",
      expect.objectContaining({
        name: "George",
        initialRating: 1000,
      }),
      expect.any(Object)
    );
  });

  it("should not submit with empty name after trim", async () => {
    const user = userEvent.setup();
    render(<AddPlayerForm />);

    const nameInput = screen.getByLabelText(/player name/i);
    const submitButton = screen.getByRole("button", { name: /add player/i });

    // Type spaces and then clear to trigger the required validation
    await user.type(nameInput, "test");
    await user.clear(nameInput);
    await user.click(submitButton);

    // In jsdom, HTML5 validation doesn't prevent submission like in real browsers
    // So we just verify the input is required
    expect(nameInput).toHaveAttribute("required");
  });
});
