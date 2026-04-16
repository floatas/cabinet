"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildConversationInstanceKey } from "@/lib/agents/conversation-identity";
import {
  formatRelative,
  StatusIcon,
  TriggerIcon,
  TRIGGER_LABELS,
  TRIGGER_STYLES,
} from "./cabinet-utils";
import type { ConversationMeta } from "@/types/conversations";

interface ActivityFeedProps {
  cabinetPath: string;
  visibilityMode: string;
  agents: { slug: string; emoji: string; name: string; cabinetPath?: string }[];
  onOpen: (conv: ConversationMeta) => void;
  onOpenWorkspace: () => void;
}

export function ActivityFeed({
  cabinetPath,
  visibilityMode,
  agents,
  onOpen,
  onOpenWorkspace,
}: ActivityFeedProps) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const agentBySlug = useMemo(() => {
    const map = new Map<string, { emoji: string; name: string }>();
    for (const a of agents) map.set(a.slug, { emoji: a.emoji, name: a.name });
    return map;
  }, [agents]);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ cabinetPath, limit: "20" });
      if (visibilityMode !== "own") params.set("visibilityMode", visibilityMode);
      const res = await fetch(`/api/agents/conversations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setConversations((data.conversations || []) as ConversationMeta[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [cabinetPath, visibilityMode]);

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => void refresh(), 6000);
    return () => clearInterval(iv);
  }, [refresh]);

  // Pin running conversations to top
  const sorted = useMemo(() => {
    const running = conversations.filter((c) => c.status === "running");
    const rest = conversations.filter((c) => c.status !== "running");
    return [...running, ...rest];
  }, [conversations]);

  const runningCount = sorted.filter((c) => c.status === "running").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Activity
          </h2>
          <p className="text-[12px] text-muted-foreground">
            {loading ? "Loading..." : `${conversations.length} recent`}
            {runningCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {runningCount} running
              </span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 text-xs"
          onClick={onOpenWorkspace}
        >
          <Users className="h-3.5 w-3.5" />
          View all
        </Button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading activity...
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No conversations yet. Run a heartbeat or send a task to an agent.
        </p>
      ) : (
        <div className="space-y-1">
          {sorted.map((conv) => {
            const agent = agentBySlug.get(conv.agentSlug);
            const isRunning = conv.status === "running";

            return (
              <button
                key={buildConversationInstanceKey(conv)}
                onClick={() => onOpen(conv)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  "hover:bg-muted/30",
                  isRunning && "border-l-2 border-emerald-500/50 bg-emerald-500/5"
                )}
              >
                {/* Agent avatar with status overlay */}
                <div className="relative shrink-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 text-base leading-none">
                    {agent?.emoji || "🤖"}
                  </span>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusIcon status={conv.status} />
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-snug text-foreground">
                    {conv.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {agent?.name || conv.agentSlug}
                    {conv.summary ? ` · ${conv.summary}` : ""}
                  </p>
                </div>

                {/* Trigger badge */}
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    TRIGGER_STYLES[conv.trigger]
                  )}
                  title={TRIGGER_LABELS[conv.trigger]}
                >
                  <TriggerIcon trigger={conv.trigger} />
                  {TRIGGER_LABELS[conv.trigger]}
                </span>

                {/* Time */}
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
                  {formatRelative(conv.startedAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
