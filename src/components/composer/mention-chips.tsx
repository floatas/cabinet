"use client";

import { X, FileText, Bot } from "lucide-react";
import type { MentionableItem } from "@/hooks/use-composer";

interface MentionChipsProps {
  mentionedPaths: string[];
  mentionedAgents: string[];
  items: MentionableItem[];
  onRemove: (type: "page" | "agent", id: string) => void;
}

export function MentionChips({
  mentionedPaths,
  mentionedAgents,
  items,
  onRemove,
}: MentionChipsProps) {
  if (mentionedPaths.length === 0 && mentionedAgents.length === 0) return null;

  const findLabel = (type: "page" | "agent", id: string) =>
    items.find((i) => i.type === type && i.id === id)?.label || id;

  const findIcon = (slug: string) =>
    items.find((i) => i.type === "agent" && i.id === slug)?.icon;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {mentionedAgents.map((slug) => (
        <span
          key={`agent-${slug}`}
          className="group inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary"
        >
          {findIcon(slug) ? (
            <span className="text-[11px]">{findIcon(slug)}</span>
          ) : (
            <Bot className="h-3 w-3" />
          )}
          {findLabel("agent", slug)}
          <button
            onClick={() => onRemove("agent", slug)}
            className="ml-0.5 inline-flex h-3.5 w-0 items-center justify-center overflow-hidden rounded-full opacity-0 transition-all duration-150 group-hover:w-3.5 group-hover:opacity-100 hover:bg-primary/20"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {mentionedPaths.map((path) => (
        <span
          key={`page-${path}`}
          className="group inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          <FileText className="h-3 w-3" />
          {findLabel("page", path)}
          <button
            onClick={() => onRemove("page", path)}
            className="ml-0.5 inline-flex h-3.5 w-0 items-center justify-center overflow-hidden rounded-full opacity-0 transition-all duration-150 group-hover:w-3.5 group-hover:opacity-100 hover:bg-foreground/10"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
