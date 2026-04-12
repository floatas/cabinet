"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Inbox,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { CABINET_VISIBILITY_OPTIONS } from "@/lib/cabinets/visibility";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import type { AgentTask, AgentListItem } from "@/types/agents";
import type { CabinetOverview, CabinetVisibilityMode } from "@/types/cabinets";
import type { ConversationMeta } from "@/types/conversations";

type TaskStatus = AgentTask["status"];

const LANE_ORDER: TaskStatus[] = ["pending", "in_progress", "completed", "failed"];
const PRIORITY_OPTIONS = [
  { label: "P0", value: "1" },
  { label: "P1", value: "2" },
  { label: "P2", value: "3" },
  { label: "P3", value: "4" },
] as const;

const LANE_COPY: Record<
  TaskStatus,
  {
    title: string;
    description: string;
    icon: typeof Inbox;
    badge: string;
  }
> = {
  pending: {
    title: "Inbox",
    description: "Tasks waiting to be launched.",
    icon: Inbox,
    badge: "bg-amber-500/10 text-amber-700",
  },
  in_progress: {
    title: "Running",
    description: "Work already in motion.",
    icon: Loader2,
    badge: "bg-sky-500/10 text-sky-700",
  },
  completed: {
    title: "Completed",
    description: "Finished runs with outcomes attached.",
    icon: CheckCircle2,
    badge: "bg-emerald-500/10 text-emerald-700",
  },
  failed: {
    title: "Failed",
    description: "Runs that need another pass.",
    icon: XCircle,
    badge: "bg-destructive/10 text-destructive",
  },
};

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatRelative(iso?: string): string {
  if (!iso) return "just now";
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function scopedAgentKey(cabinetPath: string | undefined, slug: string): string {
  return `${cabinetPath || ROOT_CABINET_PATH}::agent::${slug}`;
}

function priorityLabel(priority: number): string {
  if (priority <= 1) return "P0";
  if (priority <= 2) return "P1";
  if (priority <= 3) return "P2";
  return "P3";
}

function priorityTone(priority: number): string {
  if (priority <= 1) return "bg-destructive/10 text-destructive";
  if (priority <= 2) return "bg-amber-500/10 text-amber-700";
  if (priority <= 3) return "bg-sky-500/10 text-sky-700";
  return "bg-muted text-muted-foreground";
}

function taskPrompt(task: AgentTask): string {
  return task.description.trim()
    ? `${task.title.trim()}\n\nContext:\n${task.description.trim()}`
    : task.title.trim();
}

function statusIcon(status: TaskStatus, animate = false) {
  if (status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }
  if (status === "failed") {
    return <XCircle className="size-4 text-destructive" />;
  }
  if (status === "in_progress") {
    return <Loader2 className={cn("size-4 text-sky-600", animate && "animate-spin")} />;
  }
  return <Circle className="size-4 text-amber-600" />;
}

function CreateTaskDialog({
  open,
  onOpenChange,
  visibleAgents,
  selectedCreateAgentId,
  onSelectedCreateAgentIdChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  creating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleAgents: CabinetOverview["agents"];
  selectedCreateAgentId: string | null;
  onSelectedCreateAgentIdChange: (value: string | null) => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  creating: boolean;
  onSubmit: () => void;
}) {
  const createAgentItems = visibleAgents.map((agent) => ({
    label: `${agent.name}${agent.cabinetName ? ` · ${agent.cabinetName}` : ""}`,
    value: agent.scopedId,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Inbox Task</DialogTitle>
          <DialogDescription>
            Queue a task for an agent. It will land in the Inbox lane until you run it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="task-title"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70"
            >
              Task title
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Draft the next task you want an agent to execute"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="task-context"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70"
            >
              Context
            </label>
            <textarea
              id="task-context"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Optional details, constraints, or acceptance notes"
              className="min-h-[140px] rounded-[22px] border border-input bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                Agent
              </label>
              <Select
                items={createAgentItems}
                value={selectedCreateAgentId}
                onValueChange={(value) =>
                  onSelectedCreateAgentIdChange(typeof value === "string" ? value : null)
                }
                disabled={visibleAgents.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No visible agents" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {visibleAgents.map((agent) => (
                      <SelectItem key={agent.scopedId} value={agent.scopedId}>
                        <span className="text-sm leading-none">{agent.emoji || "🤖"}</span>
                        <span className="truncate">
                          {agent.name}
                          {agent.cabinetName ? ` · ${agent.cabinetName}` : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                Priority
              </label>
              <Select
                items={PRIORITY_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={priority}
                onValueChange={(value) => onPriorityChange(String(value || "3"))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!title.trim() || !selectedCreateAgentId || creating}
          >
            {creating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Add to inbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskCard({
  task,
  isLive,
  agentLabel,
  cabinetLabel,
  onRun,
  onOpenRun,
  onUpdateStatus,
  runningTaskId,
  updatingTaskId,
}: {
  task: AgentTask;
  isLive: boolean;
  agentLabel: string;
  cabinetLabel: string | null;
  onRun: (task: AgentTask) => void;
  onOpenRun: (task: AgentTask) => void;
  onUpdateStatus: (task: AgentTask, status: TaskStatus) => void;
  runningTaskId: string | null;
  updatingTaskId: string | null;
}) {
  const pendingRun = runningTaskId === task.id;
  const pendingUpdate = updatingTaskId === task.id;
  const canOpenRun = Boolean(task.linkedConversationId);
  const metadataLabel = [agentLabel, cabinetLabel, `from ${task.fromName || task.fromAgent}`]
    .filter(Boolean)
    .join(" · ");
  const updatedLabel =
    task.status === "completed" || task.status === "failed"
      ? formatRelative(task.completedAt)
      : formatRelative(task.updatedAt || task.createdAt);

  return (
    <article className="border-b border-border/70 transition-colors hover:bg-accent/35 last:border-b-0">
      <div className="flex items-start gap-2 px-3 py-2">
        <div className="mt-0.5 shrink-0">
          {statusIcon(task.status, task.status === "in_progress" && isLive)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-medium leading-[1.35] text-foreground">
                {task.title}
              </p>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <p className="truncate">{metadataLabel}</p>
                <span className="shrink-0">{updatedLabel}</span>
              </div>
            </div>

            <span
              className={cn(
                "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]",
                priorityTone(task.priority)
              )}
            >
              {priorityLabel(task.priority)}
            </span>
          </div>

          {task.description ? (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-4.5 text-muted-foreground">
              {task.description}
            </p>
          ) : null}

          {task.result ? (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-4.5 text-foreground/80">
              {task.result}
            </p>
          ) : null}

          {task.linkedConversationId ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {isLive ? "Live run attached" : "Run linked"}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.status === "pending" ? (
              <Button
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => onRun(task)}
                disabled={pendingRun}
              >
                {pendingRun ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Play data-icon="inline-start" />
                )}
                Run now
              </Button>
            ) : null}

            {task.status === "in_progress" && canOpenRun ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => onOpenRun(task)}
              >
                <ArrowUpRight data-icon="inline-start" />
                Open run
              </Button>
            ) : null}

            {task.status === "in_progress" && !canOpenRun ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => onUpdateStatus(task, "completed")}
                  disabled={pendingUpdate}
                >
                  {pendingUpdate ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CheckCircle2 data-icon="inline-start" />
                  )}
                  Mark done
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
                  onClick={() => onUpdateStatus(task, "failed")}
                  disabled={pendingUpdate}
                >
                  <XCircle data-icon="inline-start" />
                  Mark failed
                </Button>
              </>
            ) : null}

            {(task.status === "completed" || task.status === "failed") && canOpenRun ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => onOpenRun(task)}
              >
                <ArrowUpRight data-icon="inline-start" />
                View run
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function TaskLane({
  status,
  tasks,
  liveConversationIds,
  agentByKey,
  onRun,
  onOpenRun,
  onUpdateStatus,
  runningTaskId,
  updatingTaskId,
  headerAction,
}: {
  status: TaskStatus;
  tasks: AgentTask[];
  liveConversationIds: Set<string>;
  agentByKey: Map<string, AgentListItem>;
  onRun: (task: AgentTask) => void;
  onOpenRun: (task: AgentTask) => void;
  onUpdateStatus: (task: AgentTask, status: TaskStatus) => void;
  runningTaskId: string | null;
  updatingTaskId: string | null;
  headerAction?: ReactNode;
}) {
  const lane = LANE_COPY[status];
  const Icon = lane.icon;

  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden border border-border/70 bg-background">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/30 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                "size-4 shrink-0 text-muted-foreground",
                status === "in_progress" && tasks.length > 0 && "animate-spin"
              )}
            />
            <h3 className="text-[14px] font-semibold text-foreground">{lane.title}</h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                lane.badge
              )}
            >
              {tasks.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{lane.description}</p>
        </div>

        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-[58vh] min-h-[320px] max-h-[640px]">
          {tasks.length === 0 ? (
            <div className="px-3 py-8 text-[12px] leading-6 text-muted-foreground">
              {status === "pending"
                ? "No inbox tasks yet. Click Add to queue the next task."
                : status === "in_progress"
                  ? "Nothing is running right now."
                  : status === "completed"
                    ? "Completed tasks will collect here as runs finish."
                    : "Failed runs will surface here so they are easy to retry."}
            </div>
          ) : (
            <div>
              {tasks.map((task) => {
                const agent =
                  agentByKey.get(scopedAgentKey(task.cabinetPath, task.toAgent)) || null;
                const cabinetLabel =
                  agent?.cabinetPath && agent.cabinetPath !== ROOT_CABINET_PATH
                    ? agent.cabinetName || startCase(agent.cabinetPath.split("/").pop())
                    : null;

                return (
                  <TaskCard
                    key={`${task.cabinetPath || ROOT_CABINET_PATH}::${task.toAgent}::${task.id}`}
                    task={task}
                    isLive={Boolean(
                      task.linkedConversationId &&
                        liveConversationIds.has(
                          `${task.linkedConversationCabinetPath || task.cabinetPath || ROOT_CABINET_PATH}::${task.linkedConversationId}`
                        )
                    )}
                    agentLabel={agent?.name || startCase(task.toAgent)}
                    cabinetLabel={cabinetLabel}
                    onRun={onRun}
                    onOpenRun={onOpenRun}
                    onUpdateStatus={onUpdateStatus}
                    runningTaskId={runningTaskId}
                    updatingTaskId={updatingTaskId}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </section>
  );
}

export function TasksBoard({
  cabinetPath,
  workspaceMode,
}: {
  cabinetPath?: string;
  workspaceMode?: "ops" | "cabinet";
} = {}) {
  const setSection = useAppStore((state) => state.setSection);
  const cabinetVisibilityModes = useAppStore((state) => state.cabinetVisibilityModes);
  const setCabinetVisibilityMode = useAppStore((state) => state.setCabinetVisibilityMode);
  const resolvedWorkspaceMode = workspaceMode || (cabinetPath ? "cabinet" : "ops");
  const effectiveCabinetPath = cabinetPath || ROOT_CABINET_PATH;
  const effectiveVisibilityMode: CabinetVisibilityMode =
    resolvedWorkspaceMode === "ops"
      ? "all"
      : cabinetVisibilityModes[effectiveCabinetPath] || "own";

  const [overview, setOverview] = useState<CabinetOverview | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCreateAgentId, setSelectedCreateAgentId] = useState<string | null>(null);
  const [selectedFilterAgentId, setSelectedFilterAgentId] = useState<string>("all");
  const [priority, setPriority] = useState<string>("3");
  const syncInFlightRef = useRef<Set<string>>(new Set());

  const refreshOverview = useCallback(async () => {
    const params = new URLSearchParams({
      path: effectiveCabinetPath,
      visibility: effectiveVisibilityMode,
    });
    const response = await fetch(`/api/cabinets/overview?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load task scope");
    }
    const data = (await response.json()) as CabinetOverview;
    setOverview(data);
  }, [effectiveCabinetPath, effectiveVisibilityMode]);

  const refreshTasks = useCallback(async () => {
    const params = new URLSearchParams({ all: "true" });
    params.set("cabinetPath", effectiveCabinetPath);
    if (effectiveVisibilityMode !== "own") {
      params.set("visibilityMode", effectiveVisibilityMode);
    }

    const response = await fetch(`/api/agents/tasks?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load tasks");
    }
    const data = await response.json();
    setTasks((data.tasks || []) as AgentTask[]);
  }, [effectiveCabinetPath, effectiveVisibilityMode]);

  const refreshConversations = useCallback(async () => {
    const params = new URLSearchParams({
      cabinetPath: effectiveCabinetPath,
      limit: "400",
    });
    if (effectiveVisibilityMode !== "own") {
      params.set("visibilityMode", effectiveVisibilityMode);
    }
    const response = await fetch(`/api/agents/conversations?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    setConversations((data.conversations || []) as ConversationMeta[]);
  }, [effectiveCabinetPath, effectiveVisibilityMode]);

  const refreshBoard = useCallback(
    async (options?: { initial?: boolean }) => {
      const initial = options?.initial === true;
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        await Promise.all([refreshOverview(), refreshTasks(), refreshConversations()]);
      } finally {
        if (initial) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [refreshConversations, refreshOverview, refreshTasks]
  );

  useEffect(() => {
    void refreshBoard({ initial: true });
    const interval = window.setInterval(() => {
      void refreshBoard();
    }, 5000);
    const onFocus = () => void refreshBoard();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshBoard]);

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

        if (nextName) {
          setDisplayName(nextName);
        }
      })
      .catch(() => {});
  }, []);

  const visibleAgents = useMemo(() => overview?.agents || [], [overview]);

  useEffect(() => {
    if (visibleAgents.length === 0) {
      setSelectedCreateAgentId(null);
      return;
    }

    const stillVisible = visibleAgents.some((agent) => agent.scopedId === selectedCreateAgentId);
    if (stillVisible) return;

    const preferredAgent =
      visibleAgents.find((agent) => agent.cabinetDepth === 0 && agent.active) ||
      visibleAgents.find((agent) => agent.active) ||
      visibleAgents[0];

    setSelectedCreateAgentId(preferredAgent?.scopedId || null);
  }, [selectedCreateAgentId, visibleAgents]);

  useEffect(() => {
    if (
      selectedFilterAgentId !== "all" &&
      !visibleAgents.some((agent) => agent.scopedId === selectedFilterAgentId)
    ) {
      setSelectedFilterAgentId("all");
    }
  }, [selectedFilterAgentId, visibleAgents]);

  const agentByKey = useMemo<Map<string, AgentListItem>>(
    () =>
      new Map(
        visibleAgents.map((agent) => [scopedAgentKey(agent.cabinetPath, agent.slug), agent])
      ),
    [visibleAgents]
  );

  const selectedCreateAgent =
    visibleAgents.find((agent) => agent.scopedId === selectedCreateAgentId) || null;
  const selectedFilterAgent =
    selectedFilterAgentId === "all"
      ? null
      : visibleAgents.find((agent) => agent.scopedId === selectedFilterAgentId) || null;

  const filteredTasks = useMemo(() => {
    if (selectedFilterAgentId === "all") return tasks;
    return tasks.filter(
      (task) => scopedAgentKey(task.cabinetPath, task.toAgent) === selectedFilterAgentId
    );
  }, [selectedFilterAgentId, tasks]);

  const filterAgentItems = useMemo(
    () => [
      { label: "All visible agents", value: "all" },
      ...visibleAgents.map((agent) => ({
        label: `${agent.name}${agent.cabinetName ? ` · ${agent.cabinetName}` : ""}`,
        value: agent.scopedId,
      })),
    ],
    [visibleAgents]
  );

  const scopeItems = useMemo(
    () =>
      CABINET_VISIBILITY_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    []
  );

  const groupedTasks = useMemo(() => {
    return LANE_ORDER.reduce<Record<TaskStatus, AgentTask[]>>(
      (acc, status) => {
        acc[status] = filteredTasks.filter((task) => task.status === status);
        return acc;
      },
      {
        pending: [],
        in_progress: [],
        completed: [],
        failed: [],
      }
    );
  }, [filteredTasks]);

  const conversationByKey = useMemo(() => {
    return new Map(
      conversations.map((conversation) => [
        `${conversation.cabinetPath || ROOT_CABINET_PATH}::${conversation.id}`,
        conversation,
      ])
    );
  }, [conversations]);

  const liveConversationIds = useMemo(() => {
    return new Set(
      conversations
        .filter((conversation) => conversation.status === "running")
        .map(
          (conversation) => `${conversation.cabinetPath || ROOT_CABINET_PATH}::${conversation.id}`
        )
    );
  }, [conversations]);

  useEffect(() => {
    const completedTasks = tasks.filter(
      (task) =>
        task.status === "in_progress" &&
        task.linkedConversationId &&
        !syncInFlightRef.current.has(task.id)
    );

    const updates = completedTasks.flatMap((task) => {
      const conversationKey = `${task.linkedConversationCabinetPath || task.cabinetPath || ROOT_CABINET_PATH}::${task.linkedConversationId}`;
      const conversation = conversationByKey.get(conversationKey);
      if (!conversation || conversation.status === "running") return [];

      const nextStatus = conversation.status === "completed" ? "completed" : "failed";
      const result =
        conversation.summary ||
        conversation.contextSummary ||
        (conversation.status === "completed" ? "Run completed." : "Run failed.");

      return [{ task, nextStatus, result }] as const;
    });

    if (updates.length === 0) return;

    updates.forEach(({ task }) => syncInFlightRef.current.add(task.id));

    void Promise.all(
      updates.map(async ({ task, nextStatus, result }) => {
        await fetch("/api/agents/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            agent: task.toAgent,
            taskId: task.id,
            cabinetPath: task.cabinetPath,
            status: nextStatus,
            result,
          }),
        });
      })
    ).finally(() => {
      updates.forEach(({ task }) => syncInFlightRef.current.delete(task.id));
      void refreshTasks();
    });
  }, [conversationByKey, refreshTasks, tasks]);

  async function createTask() {
    if (!title.trim() || !selectedCreateAgent) return;

    setCreating(true);
    try {
      await fetch("/api/agents/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAgent: "human",
          fromEmoji: "🧑",
          fromName: displayName || "You",
          toAgent: selectedCreateAgent.slug,
          title: title.trim(),
          description: description.trim(),
          priority: Number(priority),
          cabinetPath: selectedCreateAgent.cabinetPath || effectiveCabinetPath,
        }),
      });
      setTitle("");
      setDescription("");
      setPriority("3");
      setCreateDialogOpen(false);
      await refreshTasks();
    } finally {
      setCreating(false);
    }
  }

  async function runTask(task: AgentTask) {
    setRunningTaskId(task.id);
    try {
      const conversationResponse = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: task.toAgent,
          userMessage: taskPrompt(task),
          mentionedPaths: task.kbRefs || [],
          cabinetPath: task.cabinetPath || effectiveCabinetPath,
        }),
      });

      if (!conversationResponse.ok) return;
      const data = await conversationResponse.json();
      const conversation = data.conversation as ConversationMeta | undefined;
      if (!conversation?.id) return;

      await fetch("/api/agents/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          agent: task.toAgent,
          taskId: task.id,
          cabinetPath: task.cabinetPath,
          status: "in_progress",
          linkedConversationId: conversation.id,
          linkedConversationCabinetPath:
            conversation.cabinetPath || task.cabinetPath || effectiveCabinetPath,
          startedAt: new Date().toISOString(),
        }),
      });

      await Promise.all([refreshTasks(), refreshConversations()]);
    } finally {
      setRunningTaskId(null);
    }
  }

  async function updateTaskStatus(task: AgentTask, status: TaskStatus) {
    setUpdatingTaskId(task.id);
    try {
      await fetch("/api/agents/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          agent: task.toAgent,
          taskId: task.id,
          cabinetPath: task.cabinetPath,
          status,
          result:
            status === "completed"
              ? task.result || "Marked complete from the task board."
              : status === "failed"
                ? task.result || "Marked failed from the task board."
                : task.result,
        }),
      });
      await refreshTasks();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function openRun(task: AgentTask) {
    if (!task.linkedConversationId) return;
    const targetCabinetPath =
      task.linkedConversationCabinetPath || task.cabinetPath || effectiveCabinetPath;
    setSection({
      type: "agent",
      mode: "cabinet",
      slug: task.toAgent,
      cabinetPath: targetCabinetPath,
      agentScopedId: `${targetCabinetPath}::agent::${task.toAgent}`,
      conversationId: task.linkedConversationId,
    });
  }

  const cabinetName =
    overview?.cabinet.name ||
    (effectiveCabinetPath === ROOT_CABINET_PATH
      ? "Cabinet"
      : startCase(effectiveCabinetPath.split("/").pop()));
  const scopeLabel =
    CABINET_VISIBILITY_OPTIONS.find((option) => option.value === effectiveVisibilityMode)?.label ||
    "Own agents only";
  const boardTitle =
    resolvedWorkspaceMode === "cabinet" ? `${cabinetName} Task Board` : "All Cabinets Task Board";
  const boardDescription = selectedFilterAgent
    ? `${selectedFilterAgent.name} only. ${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"} in view.`
    : resolvedWorkspaceMode === "cabinet"
      ? `${scopeLabel}. ${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"} across ${visibleAgents.length} visible agent${visibleAgents.length === 1 ? "" : "s"}.`
      : `${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"} across ${visibleAgents.length} visible agent${visibleAgents.length === 1 ? "" : "s"} in all cabinets.`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border/70 bg-background/95 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-body-serif text-[1.9rem] leading-none tracking-tight text-foreground sm:text-[2.2rem]">
              {boardTitle}
            </h1>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              {boardDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Select
              items={filterAgentItems}
              value={selectedFilterAgentId}
              onValueChange={(value) =>
                setSelectedFilterAgentId(typeof value === "string" ? value : "all")
              }
            >
              <SelectTrigger className="min-w-[230px] bg-background">
                <SelectValue placeholder="All visible agents" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectItem value="all">All visible agents</SelectItem>
                  {visibleAgents.map((agent) => (
                    <SelectItem key={agent.scopedId} value={agent.scopedId}>
                      <span className="text-sm leading-none">{agent.emoji || "🤖"}</span>
                      <span className="truncate">
                        {agent.name}
                        {agent.cabinetName ? ` · ${agent.cabinetName}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {resolvedWorkspaceMode === "cabinet" ? (
              <Select
                items={scopeItems}
                value={effectiveVisibilityMode}
                onValueChange={(value) =>
                  setCabinetVisibilityMode(
                    effectiveCabinetPath,
                    value as CabinetVisibilityMode
                  )
                }
              >
                <SelectTrigger className="min-w-[170px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {CABINET_VISIBILITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => void refreshBoard()}
              disabled={refreshing}
            >
              <RefreshCw
                data-icon="inline-start"
                className={cn(refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        visibleAgents={visibleAgents}
        selectedCreateAgentId={selectedCreateAgentId}
        onSelectedCreateAgentIdChange={setSelectedCreateAgentId}
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        priority={priority}
        onPriorityChange={setPriority}
        creating={creating}
        onSubmit={() => void createTask()}
      />

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex min-h-[480px] items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading the task board…
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {LANE_ORDER.map((status) => (
                    <TaskLane
                      key={status}
                      status={status}
                      tasks={groupedTasks[status]}
                      liveConversationIds={liveConversationIds}
                      agentByKey={agentByKey}
                      onRun={(task) => void runTask(task)}
                      onOpenRun={openRun}
                      onUpdateStatus={(task, nextStatus) =>
                        void updateTaskStatus(task, nextStatus)
                      }
                      runningTaskId={runningTaskId}
                      updatingTaskId={updatingTaskId}
                      headerAction={
                        status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setCreateDialogOpen(true)}
                            disabled={visibleAgents.length === 0}
                          >
                            <Plus data-icon="inline-start" />
                            Add
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
