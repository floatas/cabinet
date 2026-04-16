"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Clock3,
  HeartPulse,
  ListTodo,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CabinetAgentSummary, CabinetJobSummary } from "@/types/cabinets";
import { cronToShortLabel } from "@/lib/agents/cron-utils";

/* ─── Types ─── */

interface InteractiveStatStripProps {
  agents: CabinetAgentSummary[];
  jobs: CabinetJobSummary[];
  onAgentClick?: (agent: CabinetAgentSummary) => void;
}

type PopoverKey = "agents" | "active" | "tasks" | "jobs" | "heartbeats" | null;

/* ─── Popover shell ─── */

function StatPopover({
  title,
  icon: Icon,
  onClose,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-[calc(100%+6px)] z-30 w-72 rounded-xl border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[12px] font-semibold">{title}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground/50 transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="max-h-[200px] overflow-y-auto px-3.5 py-2.5">{children}</div>
    </div>
  );
}

/* ─── Single metric card ─── */

function MetricCard({
  icon: Icon,
  label,
  value,
  status,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  status?: "ok" | "warning" | "neutral";
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all",
        "hover:bg-muted/50",
        active
          ? "border-primary/30 bg-primary/5"
          : "border-border/50 bg-muted/20"
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          status === "ok"
            ? "text-emerald-500"
            : status === "warning"
            ? "text-amber-500"
            : "text-muted-foreground/60"
        )}
      />
      <p
        className={cn(
          "text-[15px] font-semibold leading-none tabular-nums",
          status === "ok" ? "text-emerald-500" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
        {label}
      </p>
    </button>
  );
}

/* ─── Popover content: agent list row ─── */

function AgentRow({
  agent,
  onClick,
}: {
  agent: CabinetAgentSummary;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/40"
    >
      <span className="text-sm leading-none">{agent.emoji || "🤖"}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{agent.name}</span>
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          agent.active ? "bg-emerald-500" : "bg-muted-foreground/30"
        )}
      />
    </button>
  );
}

/* ─── Main component ─── */

export function InteractiveStatStrip({
  agents,
  jobs,
  onAgentClick,
}: InteractiveStatStripProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKey>(null);

  const toggle = useCallback(
    (key: PopoverKey) => setOpenPopover((prev) => (prev === key ? null : key)),
    []
  );
  const close = useCallback(() => setOpenPopover(null), []);

  const visibleCount = agents.length;
  const activeCount = agents.filter((a) => a.active).length;
  const taskCount = agents.reduce((sum, a) => sum + a.taskCount, 0);
  const jobCount = jobs.length;
  const heartbeatCount = agents.filter((a) => Boolean(a.heartbeat)).length;

  const activeAgents = agents.filter((a) => a.active);
  const inactiveAgents = agents.filter((a) => !a.active);
  const enabledJobs = jobs.filter((j) => j.enabled);
  const disabledJobs = jobs.filter((j) => !j.enabled);
  const heartbeatAgents = agents.filter((a) => Boolean(a.heartbeat));

  // Group agents by task count for the tasks popover
  const agentsByTasks = [...agents]
    .filter((a) => a.taskCount > 0)
    .sort((a, b) => b.taskCount - a.taskCount);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Agents */}
        <MetricCard
          icon={Users}
          label="Agents"
          value={visibleCount}
          active={openPopover === "agents"}
          onClick={() => toggle("agents")}
        />

        {/* Active */}
        <MetricCard
          icon={Zap}
          label="Active"
          value={activeCount}
          status={activeCount > 0 ? "ok" : "neutral"}
          active={openPopover === "active"}
          onClick={() => toggle("active")}
        />

        {/* Tasks */}
        <MetricCard
          icon={ListTodo}
          label="Tasks"
          value={taskCount}
          active={openPopover === "tasks"}
          onClick={() => toggle("tasks")}
        />

        {/* Jobs */}
        <MetricCard
          icon={Clock3}
          label="Jobs"
          value={jobCount}
          active={openPopover === "jobs"}
          onClick={() => toggle("jobs")}
        />

        {/* Heartbeats */}
        <MetricCard
          icon={HeartPulse}
          label="Heartbeats"
          value={heartbeatCount}
          active={openPopover === "heartbeats"}
          onClick={() => toggle("heartbeats")}
        />
      </div>

      {/* ─── Popovers ─── */}

      {openPopover === "agents" && (
        <StatPopover title={`${visibleCount} Visible Agents`} icon={Users} onClose={close}>
          {agents.length > 0 ? (
            <div className="space-y-0.5">
              {agents.map((a) => (
                <AgentRow key={a.scopedId} agent={a} onClick={() => onAgentClick?.(a)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No agents configured.</p>
          )}
        </StatPopover>
      )}

      {openPopover === "active" && (
        <StatPopover title={`${activeCount} Active`} icon={Zap} onClose={close}>
          {activeAgents.length > 0 ? (
            <div className="space-y-0.5">
              {activeAgents.map((a) => (
                <AgentRow key={a.scopedId} agent={a} onClick={() => onAgentClick?.(a)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No agents are active.</p>
          )}
          {inactiveAgents.length > 0 && (
            <div className="mt-2 border-t border-border/50 pt-2">
              <p className="mb-1 text-[10px] font-medium text-muted-foreground/60">
                Paused ({inactiveAgents.length})
              </p>
              {inactiveAgents.map((a) => (
                <AgentRow key={a.scopedId} agent={a} onClick={() => onAgentClick?.(a)} />
              ))}
            </div>
          )}
        </StatPopover>
      )}

      {openPopover === "tasks" && (
        <StatPopover title={`${taskCount} Tasks`} icon={ListTodo} onClose={close}>
          {agentsByTasks.length > 0 ? (
            <div className="space-y-1">
              {agentsByTasks.map((a) => (
                <button
                  key={a.scopedId}
                  type="button"
                  onClick={() => onAgentClick?.(a)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm leading-none">{a.emoji || "🤖"}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    {a.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {a.taskCount}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No pending tasks.</p>
          )}
        </StatPopover>
      )}

      {openPopover === "jobs" && (
        <StatPopover title={`${jobCount} Jobs`} icon={Clock3} onClose={close}>
          {enabledJobs.length > 0 && (
            <div className="space-y-1">
              {enabledJobs.map((j) => (
                <div key={j.scopedId} className="flex items-center gap-2 px-1.5 py-1">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    {j.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {cronToShortLabel(j.schedule)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {disabledJobs.length > 0 && (
            <div className={cn(enabledJobs.length > 0 && "mt-2 border-t border-border/50 pt-2")}>
              <p className="mb-1 text-[10px] font-medium text-muted-foreground/60">
                Disabled ({disabledJobs.length})
              </p>
              {disabledJobs.map((j) => (
                <div key={j.scopedId} className="flex items-center gap-2 px-1.5 py-1 opacity-60">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    {j.name}
                  </span>
                </div>
              ))}
            </div>
          )}
          {jobs.length === 0 && (
            <p className="text-xs text-muted-foreground">No jobs configured.</p>
          )}
        </StatPopover>
      )}

      {openPopover === "heartbeats" && (
        <StatPopover title={`${heartbeatCount} Heartbeats`} icon={HeartPulse} onClose={close}>
          {heartbeatAgents.length > 0 ? (
            <div className="space-y-1">
              {heartbeatAgents.map((a) => (
                <button
                  key={a.scopedId}
                  type="button"
                  onClick={() => onAgentClick?.(a)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm leading-none">{a.emoji || "🤖"}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    {a.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-400">
                    {cronToShortLabel(a.heartbeat || "")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No heartbeats configured.</p>
          )}
        </StatPopover>
      )}
    </div>
  );
}
