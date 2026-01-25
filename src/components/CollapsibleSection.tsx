import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { useCollapsibleState } from "../hooks/useCollapsibleState";

interface CollapsibleSectionProps {
  /** Unique storage key for persisting state (e.g., "section-home-ranking") */
  storageKey: string;
  /** Section title displayed in the header */
  title: string;
  /** Whether the section should be open by default (when no stored preference exists) */
  defaultOpen: boolean;
  /** Content to display when expanded */
  children: ReactNode;
  /** Optional element to display on the right side of the header (e.g., "STR" label) */
  headerRight?: ReactNode;
}

export function CollapsibleSection({
  storageKey,
  title,
  defaultOpen,
  children,
  headerRight,
}: CollapsibleSectionProps) {
  const [isOpen, toggle] = useCollapsibleState(storageKey, defaultOpen);

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
