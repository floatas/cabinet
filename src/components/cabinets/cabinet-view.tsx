"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock3, FolderOpen, FolderTree, HeartPulse, LayoutList, Loader2, Maximize2, Minimize2, Save, Send, Users, Zap } from "lucide-react";
import { KBEditor } from "@/components/editor/editor";
import { HeaderActions } from "@/components/layout/header-actions";
import { VersionHistory } from "@/components/editor/version-history";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SchedulePicker } from "@/components/mission-control/schedule-picker";
import { cronToShortLabel } from "@/lib/agents/cron-utils";
import { CABINET_VISIBILITY_OPTIONS } from "@/lib/cabinets/visibility";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { sortOrgAgents, startCase, rankAgentType } from "./cabinet-utils";
import { CabinetTaskComposer } from "./cabinet-task-composer";
import { CabinetSchedulerControls } from "./cabinet-scheduler-controls";
import { InteractiveStatStrip } from "./interactive-stat-strip";
import { ActivityFeed } from "./activity-feed";
import { ScheduleCalendar, type CalendarMode } from "./schedule-calendar";
import { ScheduleList } from "./schedule-list";
import type { ScheduleEvent } from "@/lib/agents/cron-compute";
import type { ConversationMeta } from "@/types/conversations";
import type {
  CabinetAgentSummary,
  CabinetJobSummary,
  CabinetOverview,
} from "@/types/cabinets";

/* ─── Compact Org Chart (kept as-is — user loves it) ─── */

function CompactOrgChart({
  cabinetName,
  agents,
  jobs,
  children,
  onAgentClick,
  onAgentSend,
  onChildCabinetClick,
}: {
  cabinetName: string;
  agents: CabinetAgentSummary[];
  jobs: CabinetJobSummary[];
  children: CabinetOverview["children"];
  onAgentClick?: (agent: CabinetAgentSummary) => void;
  onAgentSend?: (agent: CabinetAgentSummary) => void;
  onChildCabinetClick?: (cabinet: CabinetOverview["children"][number]) => void;
}) {
  const allAgents = [...agents].sort(sortOrgAgents);
  const grouped = Object.entries(
    allAgents.reduce<Record<string, CabinetAgentSummary[]>>((acc, agent) => {
      const dept = agent.department || "general";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(agent);
      return acc;
    }, {})
  )
    .sort(([l], [r]) => {
      if (l === "executive") return -1;
      if (r === "executive") return 1;
      if (l === "general") return 1;
      if (r === "general") return -1;
      return startCase(l).localeCompare(startCase(r));
    })
    .map(([dept, deptAgents]) => ({
      dept,
      label: startCase(dept),
      agents: deptAgents.sort(sortOrgAgents),
    }));
  const groupedRows = grouped.reduce<typeof grouped[]>((rows, group, index) => {
    const rowIndex = Math.floor(index / 4);
    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex].push(group);
    return rows;
  }, []);

  const connectorColor = "rgba(139, 94, 60, 0.26)";
  const rootFill = "rgba(139, 94, 60, 0.1)";
  const rootBorder = "rgba(139, 94, 60, 0.2)";

  function jobsForAgent(agent: CabinetAgentSummary) {
    return jobs.filter((job) => {
      if (job.ownerScopedId) return job.ownerScopedId === agent.scopedId;
      return job.ownerAgent === agent.slug && job.cabinetPath === agent.cabinetPath;
    });
  }

  function VerticalConnector({ height = 18 }: { height?: number }) {
    return (
      <div
        className="mx-auto w-px"
        style={{ height, backgroundColor: connectorColor }}
      />
    );
  }

  function HorizontalBranch({ count }: { count: number }) {
    if (count <= 1) return <VerticalConnector height={14} />;

    const edgeInset = count <= 2 ? 25 : count <= 3 ? 16.67 : 12.5;
    const spacing = count <= 1 ? 0 : (100 - edgeInset * 2) / (count - 1);

    return (
      <div className="relative mx-5 h-4">
        <div
          className="absolute top-0 h-px"
          style={{
            left: `${edgeInset}%`,
            right: `${edgeInset}%`,
            backgroundColor: connectorColor,
          }}
        />
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="absolute top-0 w-px"
            style={{
              left: `${edgeInset + index * spacing}%`,
              height: 16,
              backgroundColor: connectorColor,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      {allAgents.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">No agents configured for this cabinet yet.</p>
      ) : (
        <div className="min-w-[720px] px-2">
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5"
              style={{ backgroundColor: rootFill, borderColor: rootBorder }}
            >
              <FolderTree className="h-4 w-4 shrink-0 text-[rgb(139,94,60)]" />
              <div>
                <p className="text-sm font-semibold text-foreground">{cabinetName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {agents.length} visible agent{agents.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {groupedRows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`}>
              <VerticalConnector height={20} />
              <HorizontalBranch count={row.length} />
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
              >
                {row.map((group) => (
                  <div key={group.dept} className="flex flex-col items-center">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5"
                      style={{
                        backgroundColor: "rgba(139, 94, 60, 0.05)",
                        borderColor: "rgba(139, 94, 60, 0.16)",
                      }}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[rgb(139,94,60)]" />
                      <span className="text-xs font-medium text-foreground">{group.label}</span>
                    </div>
                    <VerticalConnector height={10} />
                    <div className="flex w-full flex-col items-center gap-2">
                      {group.agents.map((agent) => {
                        const agentJobs = jobsForAgent(agent);

                        return (
                          <div key={agent.scopedId} className="flex w-full flex-col items-center gap-1.5">
                            <div className="flex w-full max-w-[220px] items-stretch gap-1.5">
                              <button
                                type="button"
                                onClick={() => onAgentClick?.(agent)}
                                className={cn(
                                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left transition-colors",
                                  onAgentClick && "hover:bg-muted/30"
                                )}
                                style={{ borderColor: "rgba(139, 94, 60, 0.14)" }}
                              >
                                <span className="text-base leading-none">{agent.emoji || "🤖"}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12px] font-medium text-foreground">
                                    {agent.name}
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {agent.role}
                                    {agent.inherited ? ` · ${agent.cabinetName}` : ""}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    agent.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                                  )}
                                />
                              </button>

                              {onAgentSend ? (
                                <button
                                  type="button"
                                  onClick={() => onAgentSend(agent)}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-foreground transition-colors hover:bg-muted/30"
                                  style={{ borderColor: "rgba(139, 94, 60, 0.14)" }}
                                  aria-label={`Open chat with ${agent.name}`}
                                  title={`Open chat with ${agent.name}`}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>

                            {agentJobs.length > 0 ? (
                              <div className="flex w-full flex-col items-center gap-1">
                                {agentJobs.map((job) => (
                                  <div
                                    key={job.scopedId}
                                    className="flex w-full max-w-[182px] items-center gap-1.5 rounded-lg border bg-muted/15 px-2.5 py-1.5"
                                    style={{ borderColor: "rgba(139, 94, 60, 0.12)" }}
                                  >
                                    <Clock3 className="h-3 w-3 shrink-0 text-[rgb(139,94,60)]" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[10px] font-medium text-foreground">
                                        {job.name}
                                      </p>
                                      <p className="truncate text-[9px] text-muted-foreground">
                                        {cronToShortLabel(job.schedule)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {children.length > 0 ? (
            <div className="mt-8">
              <div className="flex flex-wrap gap-3">
                {children.map((child) => (
                  <button
                    key={child.path}
                    type="button"
                    onClick={() => onChildCabinetClick?.(child)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left transition-colors",
                      onChildCabinetClick && "hover:bg-muted/30"
                    )}
                    style={{ borderColor: "rgba(139, 94, 60, 0.14)" }}
                  >
                    <FolderTree className="h-3.5 w-3.5 shrink-0 text-[rgb(139,94,60)]" />
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{child.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        depth {child.cabinetDepth ?? 1}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ─── Main View ─── */
export function CabinetView({ cabinetPath }: { cabinetPath: string }) {
  const [overview, setOverview] = useState<CabinetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [requestedAgent, setRequestedAgent] = useState<CabinetAgentSummary | null>(null);
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  const [jobDialog, setJobDialog] = useState<{
    agentSlug: string;
    agentName: string;
    cabinetPath: string;
    draft: { id: string; name: string; schedule: string; prompt: string; enabled: boolean };
  } | null>(null);
  const [heartbeatDialog, setHeartbeatDialog] = useState<{
    agentSlug: string;
    agentName: string;
    cabinetPath: string;
    heartbeat: string;
    active: boolean;
  } | null>(null);
  const [dialogRunning, setDialogRunning] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [scheduleView, setScheduleView] = useState<"calendar" | "list">("calendar");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const scrollAreaHostRef = useRef<HTMLDivElement>(null);
  const titleSectionRef = useRef<HTMLDivElement>(null);
  const selectPage = useTreeStore((state) => state.selectPage);
  const loadPage = useEditorStore((state) => state.loadPage);
  const setSection = useAppStore((state) => state.setSection);
  const cabinetVisibilityModes = useAppStore((state) => state.cabinetVisibilityModes);
  const setCabinetVisibilityMode = useAppStore((state) => state.setCabinetVisibilityMode);
  const cabinetVisibilityMode = cabinetVisibilityModes[cabinetPath] || "own";

  const openCabinet = useCallback(
    (path: string) => {
      selectPage(path);
      void loadPage(path);
      setSection({
        type: "cabinet",
        mode: "cabinet",
        cabinetPath: path,
      });
    },
    [loadPage, selectPage, setSection]
  );

  const openCabinetAgent = useCallback(
    (agent: CabinetAgentSummary) => {
      const targetCabinetPath = agent.cabinetPath || cabinetPath;
      setSection({
        type: "agent",
        mode: "cabinet",
        slug: agent.slug,
        cabinetPath: targetCabinetPath,
        agentScopedId: agent.scopedId || `${targetCabinetPath}::agent::${agent.slug}`,
      });
    },
    [cabinetPath, setSection]
  );

  const openCabinetAgentsWorkspace = useCallback(() => {
    setSection({
      type: "agents",
      mode: "cabinet",
      cabinetPath,
    });
  }, [cabinetPath, setSection]);

  const openConversation = useCallback(
    (conversation: ConversationMeta) => {
      const targetCabinetPath = conversation.cabinetPath || cabinetPath;
      setSection({
        type: "agent",
        mode: "cabinet",
        slug: conversation.agentSlug,
        cabinetPath: targetCabinetPath,
        agentScopedId: `${targetCabinetPath}::agent::${conversation.agentSlug}`,
        conversationId: conversation.id,
      });
    },
    [cabinetPath, setSection]
  );

  const primeTaskComposer = useCallback((agent: CabinetAgentSummary) => {
    setRequestedAgent(agent);
    setComposerFocusRequest((current) => current + 1);
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ path: cabinetPath, visibility: cabinetVisibilityMode });
      const response = await fetch(`/api/cabinets/overview?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to load cabinet overview");
      }
      const data = (await response.json()) as CabinetOverview;
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [cabinetPath, cabinetVisibilityMode]);

  useEffect(() => {
    void loadOverview();
    const interval = window.setInterval(() => void loadOverview(), 15000);
    const onFocus = () => void loadOverview();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadOverview]);

  useEffect(() => {
    fetch("/api/agents/config")
      .then((response) => response.json())
      .then((data) => {
        const nextName = [
          data?.person?.name,
          data?.user?.name,
          data?.owner?.name,
          data?.company?.name,
          typeof data?.company === "string" ? data.company : null,
        ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

        if (nextName) setDisplayName(nextName);
      })
      .catch(() => {});
  }, []);

  const cabinetName =
    overview?.cabinet.name ||
    cabinetPath.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
    "Cabinet";
  const cabinetDescription =
    overview?.cabinet.description ||
    "Portable software layer for agents, jobs, and knowledge.";
  const ownAgents = useMemo(
    () => (overview?.agents || []).filter((a) => a.cabinetDepth === 0),
    [overview?.agents]
  );
  const boardName = displayName || "there";

  async function runDialogJob() {
    if (!jobDialog) return;
    setDialogRunning(true);
    try {
      const res = await fetch(`/api/agents/${jobDialog.agentSlug}/jobs/${jobDialog.draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", cabinetPath: jobDialog.cabinetPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setJobDialog(null);
        if (data.run?.id) {
          setSection({
            type: "agent",
            mode: "cabinet",
            slug: jobDialog.agentSlug,
            cabinetPath: jobDialog.cabinetPath,
            agentScopedId: `${jobDialog.cabinetPath}::agent::${jobDialog.agentSlug}`,
            conversationId: data.run.id,
          });
        }
      }
    } finally {
      setDialogRunning(false);
    }
  }

  async function saveDialogJob() {
    if (!jobDialog) return;
    setDialogSaving(true);
    try {
      const query = `?cabinetPath=${encodeURIComponent(jobDialog.cabinetPath)}`;
      await fetch(`/api/agents/${jobDialog.agentSlug}/jobs/${jobDialog.draft.id}${query}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobDialog.draft),
      });
      setJobDialog(null);
      void loadOverview();
    } finally {
      setDialogSaving(false);
    }
  }

  async function runDialogHeartbeat() {
    if (!heartbeatDialog) return;
    setDialogRunning(true);
    try {
      const res = await fetch(`/api/agents/personas/${heartbeatDialog.agentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", cabinetPath: heartbeatDialog.cabinetPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setHeartbeatDialog(null);
        if (data.sessionId) {
          setSection({
            type: "agent",
            mode: "cabinet",
            slug: heartbeatDialog.agentSlug,
            cabinetPath: heartbeatDialog.cabinetPath,
            agentScopedId: `${heartbeatDialog.cabinetPath}::agent::${heartbeatDialog.agentSlug}`,
            conversationId: data.sessionId,
          });
        }
      }
    } finally {
      setDialogRunning(false);
    }
  }

  async function saveDialogHeartbeat() {
    if (!heartbeatDialog) return;
    setDialogSaving(true);
    try {
      await fetch(`/api/agents/personas/${heartbeatDialog.agentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heartbeat: heartbeatDialog.heartbeat,
          active: heartbeatDialog.active,
          cabinetPath: heartbeatDialog.cabinetPath,
        }),
      });
      setHeartbeatDialog(null);
      void loadOverview();
    } finally {
      setDialogSaving(false);
    }
  }

  function handleScheduleEventClick(event: ScheduleEvent) {
    if (event.sourceType === "job" && event.jobRef && event.agentRef) {
      setJobDialog({
        agentSlug: event.agentRef.slug,
        agentName: event.agentRef.name,
        cabinetPath: event.agentRef.cabinetPath || cabinetPath,
        draft: {
          id: event.jobRef.id,
          name: event.jobRef.name,
          schedule: event.jobRef.schedule,
          prompt: event.jobRef.prompt || "",
          enabled: event.jobRef.enabled,
        },
      });
    } else if (event.sourceType === "heartbeat" && event.agentRef) {
      setHeartbeatDialog({
        agentSlug: event.agentRef.slug,
        agentName: event.agentRef.name,
        cabinetPath: event.agentRef.cabinetPath || cabinetPath,
        heartbeat: event.agentRef.heartbeat || "0 9 * * 1-5",
        active: event.agentRef.active,
      });
    }
  }

  function navigateCalendar(direction: -1 | 0 | 1) {
    if (direction === 0) {
      setCalendarAnchor(new Date());
      return;
    }
    setCalendarAnchor((prev) => {
      const next = new Date(prev);
      if (calendarMode === "day") next.setDate(next.getDate() + direction);
      else if (calendarMode === "week") next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  }

  const calendarLabel = useMemo(() => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (calendarMode === "day") {
      return calendarAnchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    }
    if (calendarMode === "month") {
      return `${months[calendarAnchor.getMonth()]} ${calendarAnchor.getFullYear()}`;
    }
    // week: show range
    const start = new Date(calendarAnchor);
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}`;
  }, [calendarAnchor, calendarMode]);

  const sectionSurfaces = {
    overview: "color-mix(in oklch, var(--background) 95%, var(--muted) 5%)",
    graph: "color-mix(in oklch, var(--background) 96%, var(--muted) 4%)",
    activity: "color-mix(in oklch, var(--background) 96%, var(--muted) 4%)",
    operations: "color-mix(in oklch, var(--background) 94%, var(--secondary) 6%)",
  } as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ─── Header bar ─── */}
      <div className="border-b border-border/70 bg-background/95 px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0" ref={titleSectionRef}>
            <h1 className="font-body-serif text-[1.9rem] leading-none tracking-tight text-foreground sm:text-[2.2rem]">
              {cabinetName}
            </h1>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              {cabinetDescription}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <CabinetSchedulerControls
              cabinetPath={cabinetPath}
              ownAgents={ownAgents}
              onRefresh={() => void loadOverview()}
            />
            <div className="flex items-center gap-1">
              <VersionHistory />
              <HeaderActions />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <InteractiveStatStrip
            agents={overview?.agents || []}
            jobs={overview?.jobs || []}
            onAgentClick={openCabinetAgent}
          />

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
              Scope
            </span>
            {CABINET_VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setCabinetVisibilityMode(cabinetPath, option.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  cabinetVisibilityMode === option.value
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-transparent text-muted-foreground/70 hover:text-foreground"
                )}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Scrollable content ─── */}
      <div ref={scrollAreaHostRef} className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
            {error ? (
              <div className="mb-8 border-b border-destructive/20 pb-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {/* ── Section 1: Composer ── */}
            <section
              className="-mx-4 border-b border-border/70 px-4 pb-8 pt-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              style={{ backgroundColor: sectionSurfaces.overview }}
            >
              <div>
                <CabinetTaskComposer
                  cabinetPath={cabinetPath}
                  agents={overview?.agents || []}
                  displayName={boardName}
                  requestedAgent={requestedAgent}
                  focusRequest={composerFocusRequest}
                  onNavigate={(agentSlug, agentCabinetPath, conversationId) =>
                    setSection({
                      type: "agent",
                      mode: "cabinet",
                      slug: agentSlug,
                      cabinetPath: agentCabinetPath,
                      agentScopedId: `${agentCabinetPath}::agent::${agentSlug}`,
                      conversationId,
                    })
                  }
                />
              </div>
            </section>

            {/* ── Section 3: Org Chart ── */}
            <section
              className="-mx-4 border-b border-border/70 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              style={{ backgroundColor: sectionSurfaces.graph }}
            >
              <div className="mb-5 flex items-end justify-between gap-4">
                <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
                  Cabinet team
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-xs"
                  onClick={openCabinetAgentsWorkspace}
                >
                  <Users className="h-3.5 w-3.5" />
                  Open agents workspace
                </Button>
              </div>

              {loading && !overview ? (
                <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading mission board...
                </div>
              ) : overview ? (
                <CompactOrgChart
                  cabinetName={cabinetName}
                  agents={overview.agents}
                  jobs={overview.jobs}
                  children={overview.children}
                  onAgentClick={openCabinetAgent}
                  onAgentSend={primeTaskComposer}
                  onChildCabinetClick={(child) => openCabinet(child.path)}
                />
              ) : null}
            </section>

            {/* ── Section 4: Activity Feed ── */}
            <section
              className="-mx-4 border-b border-border/70 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              style={{ backgroundColor: sectionSurfaces.activity }}
            >
              <ActivityFeed
                cabinetPath={cabinetPath}
                visibilityMode={cabinetVisibilityMode}
                agents={(overview?.agents || []).map((agent) => ({
                  slug: agent.slug,
                  emoji: agent.emoji,
                  name: agent.name,
                  cabinetPath: agent.cabinetPath,
                }))}
                onOpen={openConversation}
                onOpenWorkspace={openCabinetAgentsWorkspace}
              />
            </section>

            {/* ── Section 5: Schedule Calendar / List ── */}
            <section
              className={cn(
                calendarFullscreen
                  ? "fixed inset-0 z-50 overflow-y-auto bg-background px-6 py-6"
                  : "-mx-4 border-b border-border/70 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              )}
              style={calendarFullscreen ? undefined : { backgroundColor: sectionSurfaces.operations }}
            >
              {/* Header */}
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
                    Jobs & heartbeats
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {overview?.jobs.length ?? 0} jobs, {overview?.agents.filter((a) => a.heartbeat).length ?? 0} heartbeats
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Calendar / List toggle */}
                  <div className="flex items-center rounded-lg border border-border/60 p-0.5">
                    <button
                      onClick={() => setScheduleView("calendar")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                        scheduleView === "calendar"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Calendar
                    </button>
                    <button
                      onClick={() => setScheduleView("list")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                        scheduleView === "list"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      List
                    </button>
                  </div>

                  {/* Calendar sub-controls */}
                  {scheduleView === "calendar" && (
                    <>
                      <div className="flex items-center rounded-lg border border-border/60 p-0.5">
                        {(["day", "week", "month"] as CalendarMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setCalendarMode(m)}
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                              calendarMode === m
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigateCalendar(-1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigateCalendar(0)}
                          className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => navigateCalendar(1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <span className="text-sm font-medium text-foreground">
                        {calendarLabel}
                      </span>

                      <button
                        onClick={() => setCalendarFullscreen((v) => !v)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        title={calendarFullscreen ? "Exit full screen" : "Full screen"}
                      >
                        {calendarFullscreen ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              {scheduleView === "calendar" ? (
                <div className={cn(!calendarFullscreen && "h-[600px] overflow-hidden")}>
                <ScheduleCalendar
                  mode={calendarMode}
                  anchor={calendarAnchor}
                  agents={overview?.agents || []}
                  jobs={overview?.jobs || []}
                  fullscreen={calendarFullscreen}
                  onEventClick={handleScheduleEventClick}
                  onDayClick={(date) => {
                    setCalendarMode("day");
                    setCalendarAnchor(date);
                  }}
                />
                </div>
              ) : (
                <ScheduleList
                  agents={overview?.agents || []}
                  jobs={overview?.jobs || []}
                  onJobClick={(job, agent) => {
                    setJobDialog({
                      agentSlug: agent.slug,
                      agentName: agent.name,
                      cabinetPath: agent.cabinetPath || cabinetPath,
                      draft: {
                        id: job.id,
                        name: job.name,
                        schedule: job.schedule,
                        prompt: job.prompt || "",
                        enabled: job.enabled,
                      },
                    });
                  }}
                  onHeartbeatClick={(agent) => {
                    setHeartbeatDialog({
                      agentSlug: agent.slug,
                      agentName: agent.name,
                      cabinetPath: agent.cabinetPath || cabinetPath,
                      heartbeat: agent.heartbeat || "0 9 * * 1-5",
                      active: agent.active,
                    });
                  }}
                />
              )}
            </section>

            {/* ── Section 6: Editor ── */}
            <section
              className="-mx-4 px-4 py-10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              style={{ backgroundColor: sectionSurfaces.operations }}
            >
              <div className="min-w-0">
                <div className="min-h-[680px]">
                  <KBEditor />
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>

      {/* ─── Job dialog ─── */}
      {jobDialog ? (
        <Dialog open onOpenChange={(open) => { if (!open) setJobDialog(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-10">
                <DialogTitle className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-emerald-400" />
                  {jobDialog.draft.name || "Job"}
                  <span className="text-[11px] font-normal text-muted-foreground">· {jobDialog.agentName}</span>
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => void runDialogJob()}
                  disabled={dialogRunning}
                >
                  {dialogRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Run now
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Schedule</span>
                <SchedulePicker
                  value={jobDialog.draft.schedule || "0 9 * * 1-5"}
                  onChange={(cron) =>
                    setJobDialog((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, schedule: cron } } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Prompt</span>
                <textarea
                  value={jobDialog.draft.prompt}
                  onChange={(e) =>
                    setJobDialog((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, prompt: e.target.value } } : prev
                    )
                  }
                  className="h-48 w-full resize-none rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                  placeholder="What should this job do?"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={jobDialog.draft.enabled}
                    onChange={(e) =>
                      setJobDialog((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, enabled: e.target.checked } } : prev
                      )
                    }
                  />
                  Enabled
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setJobDialog(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => void saveDialogJob()}
                    disabled={dialogSaving}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {dialogSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* ─── Heartbeat dialog ─── */}
      {heartbeatDialog ? (
        <Dialog open onOpenChange={(open) => { if (!open) setHeartbeatDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-10">
                <DialogTitle className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-pink-400" />
                  Heartbeat
                  <span className="text-[11px] font-normal text-muted-foreground">· {heartbeatDialog.agentName}</span>
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => void runDialogHeartbeat()}
                  disabled={dialogRunning}
                >
                  {dialogRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Run now
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Schedule</span>
                <SchedulePicker
                  value={heartbeatDialog.heartbeat}
                  onChange={(cron) =>
                    setHeartbeatDialog((prev) => (prev ? { ...prev, heartbeat: cron } : prev))
                  }
                />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={heartbeatDialog.active}
                    onChange={(e) =>
                      setHeartbeatDialog((prev) =>
                        prev ? { ...prev, active: e.target.checked } : prev
                      )
                    }
                    className="h-3.5 w-3.5 cursor-pointer appearance-none rounded-sm border border-border bg-background transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
                  />
                  Active
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setHeartbeatDialog(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => void saveDialogHeartbeat()}
                    disabled={dialogSaving}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {dialogSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
