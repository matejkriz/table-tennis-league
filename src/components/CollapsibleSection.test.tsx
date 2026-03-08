import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollapsibleSection } from "./CollapsibleSection";

// Mock the useCollapsibleState hook
vi.mock("../hooks/useCollapsibleState", () => ({
  useCollapsibleState: vi.fn(),
}));

import { useCollapsibleState } from "../hooks/useCollapsibleState";

describe("CollapsibleSection", () => {
  const mockToggle = vi.fn();
  const mockSetOpen = vi.fn();
  const createHookState = (isOpen: boolean) =>
    [isOpen, mockToggle, mockSetOpen] as [
      boolean,
      typeof mockToggle,
      typeof mockSetOpen,
    ];

  beforeEach(() => {
    mockToggle.mockClear();
    mockSetOpen.mockClear();
  });

  it("should render with title", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText("Test Section")).toBeInTheDocument();
  });

  it("should show children when open", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Test Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should hide children when closed", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={false}
      >
        <div>Test Content</div>
      </CollapsibleSection>
    );

    // Content is in the DOM but should be hidden via CSS
    const content = screen.getByText("Test Content");
    expect(content).toBeInTheDocument();
    // Check for closed state CSS class (grid container is 3 levels up)
    expect(content.parentElement?.parentElement?.parentElement?.className).toContain("grid-rows-[0fr]");
  });

  it("should call toggle when header is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const header = screen.getByRole("button");
    await user.click(header);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("should pass storageKey to useCollapsibleState", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="my-custom-key"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(useCollapsibleState).toHaveBeenCalledWith("my-custom-key", true);
  });

  it("should pass defaultOpen to useCollapsibleState", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(useCollapsibleState).toHaveBeenCalledWith("test-section", false);
  });

  it("should display headerRight content when provided", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
        headerRight="STR"
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText("STR")).toBeInTheDocument();
  });

  it("should not display headerRight when not provided", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText("STR")).not.toBeInTheDocument();
  });

  it("should set aria-expanded based on open state", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    const { rerender } = render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Simulate closed state
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));
    rerender(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("should rotate chevron icon when open", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("rotate-180");
  });

  it("should not rotate chevron icon when closed", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("rotate-0");
  });

  it("should render as a section element", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    const { container } = render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("should render header as a button for accessibility", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
  });

  it("should use controlled open state when provided", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={false}
        isOpen={true}
        onToggle={mockToggle}
      >
        <div>Controlled Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Controlled Content")).toBeInTheDocument();
  });

  it("should call controlled onToggle instead of hook toggle", async () => {
    const user = userEvent.setup();
    const hookToggle = vi.fn();
    const controlledToggle = vi.fn();

    vi.mocked(useCollapsibleState).mockReturnValue(
      [true, hookToggle, mockSetOpen] as [
        boolean,
        typeof hookToggle,
        typeof mockSetOpen,
      ],
    );

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
        isOpen={true}
        onToggle={controlledToggle}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    await user.click(screen.getByRole("button"));

    expect(controlledToggle).toHaveBeenCalledTimes(1);
    expect(hookToggle).not.toHaveBeenCalled();
  });

  it("treats partial controlled props as uncontrolled", async () => {
    const user = userEvent.setup();
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));

    render(
      <CollapsibleSection
        {...({
          storageKey: "test-section",
          title: "Test Section",
          defaultOpen: false,
          isOpen: true,
        } as unknown as ComponentProps<typeof CollapsibleSection>)}
      >
        <div>Content</div>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("should support keyboard navigation", async () => {
    const user = userEvent.setup();
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(mockToggle).toHaveBeenCalled();
  });

  it("should handle complex children", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>
          <h3>Nested Title</h3>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <button>Action Button</button>
        </div>
      </CollapsibleSection>
    );

    expect(screen.getByText("Nested Title")).toBeInTheDocument();
    expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
    expect(screen.getByText("Paragraph 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action Button" })).toBeInTheDocument();
  });

  it("should apply correct CSS classes for open state", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    const { container } = render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={true}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer?.className).toContain("grid-rows-[1fr]");
  });

  it("should apply correct CSS classes for closed state", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(false));

    const { container } = render(
      <CollapsibleSection
        storageKey="test-section"
        title="Test Section"
        defaultOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer?.className).toContain("grid-rows-[0fr]");
  });

  it("should maintain unique storage keys for different sections", () => {
    vi.mocked(useCollapsibleState).mockReturnValue(createHookState(true));

    const { rerender } = render(
      <CollapsibleSection
        storageKey="section-1"
        title="Section 1"
        defaultOpen={true}
      >
        <div>Content 1</div>
      </CollapsibleSection>
    );

    expect(useCollapsibleState).toHaveBeenCalledWith("section-1", true);

    rerender(
      <CollapsibleSection
        storageKey="section-2"
        title="Section 2"
        defaultOpen={false}
      >
        <div>Content 2</div>
      </CollapsibleSection>
    );

    expect(useCollapsibleState).toHaveBeenCalledWith("section-2", false);
  });
});
