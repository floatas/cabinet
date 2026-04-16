"use client";

import { useMemo } from "react";
import { Clock3, HeartPulse } from "lucide-react";
import { cronToHuman } from "@/lib/agents/cron-utils";
import { cn } from "@/lib/utils";
import { getAgentColor } from "@/lib/agents/cron-compute";
import type { CabinetAgentSummary, CabinetJobSummary } from "@/types/cabinets";

interface ScheduleListProps {
  agents: CabinetAgentSummary[];
  jobs: CabinetJobSummary[];
  onJobClick?: (job: CabinetJobSummary, agent: CabinetAgentSummary) => void;
  onHeartbeatClick?: (agent: CabinetAgentSummary) => void;
}

interface ListItem {
  type: "job" | "heartbeat";
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  agentEmoji: string;
  agentName: string;
  agentSlug: string;
  jobRef?: CabinetJobSummary;
  agentRef?: CabinetAgentSummary;
}

export function ScheduleList({ agents, jobs, onJobClick, onHeartbeatClick }: ScheduleListProps) {
  const agentMap = useMemo(() => {
    const map = new Map<string, CabinetAgentSummary>();
    for (const a of agents) {
      map.set(a.scopedId, a);
      map.set(a.slug, a);
    }
    return map;
  }, [agents]);

  const items: ListItem[] = useMemo(() => {
    const result: ListItem[] = [];

    for (const job of jobs) {
      const owner = job.ownerScopedId
        ? agentMap.get(job.ownerScopedId)
        : job.ownerAgent
        ? agentMap.get(job.ownerAgent)
        : undefined;
      result.push({
        type: "job",
        id: job.scopedId,
        name: job.name,
        schedule: job.schedule,
        enabled: job.enabled,
        agentEmoji: owner?.emoji || "🤖",
        agentName: owner?.name || job.ownerAgent || "Unknown",
        agentSlug: owner?.slug || "",
        jobRef: job,
        agentRef: owner,
      });
    }

    for (const agent of agents) {
      if (!agent.heartbeat) continue;
      result.push({
        type: "heartbeat",
        id: `hb-${agent.scopedId}`,
        name: `${agent.name} heartbeat`,
        schedule: agent.heartbeat,
        enabled: agent.active,
        agentEmoji: agent.emoji || "🤖",
        agentName: agent.name,
        agentSlug: agent.slug,
        agentRef: agent,
      });
    }

    return result;
  }, [agents, jobs, agentMap]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No jobs or heartbeats configured yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const color = getAgentColor(item.agentSlug);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.type === "job" && item.jobRef && onJobClick) {
                const agent = item.agentRef ?? ({
                  slug: item.agentSlug,
                  name: item.agentName,
                  emoji: item.agentEmoji,
                } as CabinetAgentSummary);
                onJobClick(item.jobRef, agent);
              } else if (item.type === "heartbeat" && item.agentRef && onHeartbeatClick) {
                onHeartbeatClick(item.agentRef);
              }
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-left transition-all",
              "hover:shadow-sm hover:bg-muted/30",
              !item.enabled && "opacity-50"
            )}
            style={{ borderColor: color.bg }}
          >
            <span className="text-lg leading-none shrink-0">{item.agentEmoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {item.type === "job" ? (
                  <Clock3 className="h-3 w-3 shrink-0 text-emerald-500/70" />
                ) : (
                  <HeartPulse className="h-3 w-3 shrink-0 text-pink-500/70" />
                )}
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.agentName} · {cronToHuman(item.schedule)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                item.enabled
                  ? "bg-emerald-500/12 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {item.enabled ? "On" : "Off"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
