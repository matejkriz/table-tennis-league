import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { useCollapsibleState } from "../hooks/useCollapsibleState";

interface CollapsibleSectionBaseProps {
  /** Unique storage key for persisting state (e.g., "section-home-ranking") */
  readonly storageKey: string;
  /** Section title displayed in the header */
  readonly title: string;
  /** Whether the section should be open by default (when no stored preference exists) */
  readonly defaultOpen: boolean;
  /** Content to display when expanded */
  readonly children: ReactNode;
  /** Optional element to display on the right side of the header (e.g., "STR" label) */
  readonly headerRight?: ReactNode;
}

type ControlledCollapsibleSectionProps = CollapsibleSectionBaseProps & {
  /** Controlled open state */
  readonly isOpen: boolean;
  /** Controlled toggle handler */
  readonly onToggle: () => void;
};

type UncontrolledCollapsibleSectionProps = CollapsibleSectionBaseProps & {
  readonly isOpen?: never;
  readonly onToggle?: never;
};

type CollapsibleSectionProps =
  | ControlledCollapsibleSectionProps
  | UncontrolledCollapsibleSectionProps;

export function CollapsibleSection(props: CollapsibleSectionProps) {
  const { storageKey, title, defaultOpen, children, headerRight } = props;
  const [uncontrolledIsOpen, uncontrolledToggle] = useCollapsibleState(
    storageKey,
    defaultOpen,
  );
  const isControlled = "isOpen" in props && "onToggle" in props;
  const isOpen = isControlled ? props.isOpen : uncontrolledIsOpen;
  const toggle = isControlled ? props.onToggle : uncontrolledToggle;

  return (
    <section className="rounded-lg border border-black/10 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between p-5 text-left sm:p-6"
        aria-expanded={isOpen}
      >
        <h2 className="text-xs font-medium uppercase tracking-wider text-black/60">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {headerRight && (
            <span className="text-xs font-mono text-black/40">{headerRight}</span>
          )}
          <IconChevronDown
            size={18}
            className={`text-black/40 transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
