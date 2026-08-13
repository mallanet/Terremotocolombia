"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  tabId: string;
  panelId: string;
}

interface TabNavProps<T extends string> {
  tabs: ReadonlyArray<TabDef<T>>;
  active: T;
  onSelect: (tab: T) => void;
  ariaLabel: string;
}

export function TabNav<T extends string>({
  tabs,
  active,
  onSelect,
  ariaLabel,
}: TabNavProps<T>) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    onSelect(tabs[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex min-w-0 items-center gap-1 rounded-lg bg-muted p-1"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={tab.tabId}
          aria-selected={active === tab.id}
          aria-controls={tab.panelId}
          data-active={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            active === tab.id && "bg-background text-foreground shadow-sm",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
