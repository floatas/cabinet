"use client";

import { FileText, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MentionableItem } from "@/hooks/use-composer";

interface MentionDropdownProps {
  items: MentionableItem[];
  activeIndex: number;
  onSelect: (item: MentionableItem) => void;
  maxItems?: number;
}

export function MentionDropdown({
  items,
  activeIndex,
  onSelect,
  maxItems = 8,
}: MentionDropdownProps) {
  const agents = items.filter((i) => i.type === "agent");
  const pages = items.filter((i) => i.type === "page");
  const visibleAgents = agents.slice(0, maxItems);
  const remainingSlots = maxItems - visibleAgents.length;
  const visiblePages = pages.slice(0, Math.max(remainingSlots, 0));

  // Build a flat list to track indices consistently
  const visibleItems = [...visibleAgents, ...visiblePages];

  if (visibleItems.length === 0) return null;

  let runningIndex = 0;

  return (
    <div className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-[280px] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
      {visibleAgents.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Agents
          </div>
          {visibleAgents.map((item) => {
            const idx = runningIndex++;
            return (
              <button
                key={`agent-${idx}-${item.id}`}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px]",
                  idx === activeIndex
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {item.icon ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[13px]">
                    {item.icon}
                  </span>
                ) : (
                  <Bot className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate font-medium">{item.label}</span>
                <span className="ml-auto truncate text-[11px] text-muted-foreground">
                  {item.sublabel}
                </span>
              </button>
            );
          })}
        </>
      )}
      {visiblePages.length > 0 && (
        <>
          {visibleAgents.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Pages
            </div>
          )}
          {visiblePages.map((item) => {
            const idx = runningIndex++;
            return (
              <button
                key={`page-${idx}-${item.id}`}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px]",
                  idx === activeIndex
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
                <span className="ml-auto truncate text-[11px] text-muted-foreground">
                  {item.sublabel}
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
