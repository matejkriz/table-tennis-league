import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CollapsibleSection } from "./CollapsibleSection";

vi.mock("../hooks/useCollapsibleState", () => ({
  useCollapsibleState: vi.fn(),
}));

import { useCollapsibleState } from "../hooks/useCollapsibleState";

describe("CollapsibleSection", () => {
  it("uses persisted state when uncontrolled", async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();
    const mockSetOpen = vi.fn();
    vi.mocked(useCollapsibleState).mockReturnValue([true, mockToggle, mockSetOpen]);

    render(
      <CollapsibleSection storageKey="section-a" title="Section A" defaultOpen={false}>
        <div>Content</div>
      </CollapsibleSection>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button"));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("uses controlled isOpen and onToggle when provided", async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();
    const mockSetOpen = vi.fn();
    const onToggle = vi.fn();
    vi.mocked(useCollapsibleState).mockReturnValue([false, mockToggle, mockSetOpen]);

    render(
      <CollapsibleSection
        storageKey="section-b"
        title="Section B"
        defaultOpen={false}
        isOpen={true}
        onToggle={onToggle}
      >
        <div>Content</div>
      </CollapsibleSection>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(mockToggle).not.toHaveBeenCalled();
  });
});
