import type { CabinetAgentSummary, CabinetJobSummary } from "@/types/cabinets";

/* ─── Cron → next run computation ─── */

export function computeNextCronRun(cronExpr: string, after: Date): Date | null {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const parseField = (field: string, max: number): number[] | null => {
    if (field === "*") return null; // any
    const values: number[] = [];
    for (const part of field.split(",")) {
      const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
      if (stepMatch) {
        const step = parseInt(stepMatch[2]);
        const rangeMatch = stepMatch[1].match(/^(\d+)-(\d+)$/);
        const start = stepMatch[1] === "*" ? 0 : rangeMatch ? parseInt(rangeMatch[1]) : parseInt(stepMatch[1]);
        const end = rangeMatch ? parseInt(rangeMatch[2]) : max;
        for (let i = start; i <= end; i += step) values.push(i);
      } else {
        const rangeMatch = part.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          for (let i = parseInt(rangeMatch[1]); i <= parseInt(rangeMatch[2]); i++) values.push(i);
        } else {
          values.push(parseInt(part));
        }
      }
    }
    return values;
  };

  const minutes = parseField(parts[0], 59);
  const hours = parseField(parts[1], 23);
  const doms = parseField(parts[2], 31);
  const months = parseField(parts[3], 12);
  const dows = parseField(parts[4], 6);

  const matches = (d: Date) => {
    if (minutes && !minutes.includes(d.getMinutes())) return false;
    if (hours && !hours.includes(d.getHours())) return false;
    if (doms && !doms.includes(d.getDate())) return false;
    if (months && !months.includes(d.getMonth() + 1)) return false;
    if (dows && !dows.includes(d.getDay())) return false;
    return true;
  };

  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 35 days ahead (for month view)
  const limit = after.getTime() + 35 * 24 * 60 * 60 * 1000;
  while (candidate.getTime() < limit) {
    if (matches(candidate)) return candidate;
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
}

/* ─── Schedule event type ─── */

export interface ScheduleEvent {
  id: string;
  sourceType: "job" | "heartbeat";
  sourceId: string;
  label: string;
  agentEmoji: string;
  agentName: string;
  agentSlug: string;
  enabled: boolean;
  cronExpr: string;
  time: Date;
  jobRef?: CabinetJobSummary;
  agentRef?: CabinetAgentSummary;
}

/* ─── Generate events for a date range ─── */

export function getScheduleEvents(
  agents: CabinetAgentSummary[],
  jobs: CabinetJobSummary[],
  rangeStart: Date,
  rangeEnd: Date,
): ScheduleEvent[] {
  const agentMap = new Map<string, CabinetAgentSummary>();
  for (const a of agents) {
    agentMap.set(a.scopedId, a);
    agentMap.set(a.slug, a);
  }

  const events: ScheduleEvent[] = [];
  const MAX_EVENTS_PER_SOURCE = 500;

  // Jobs
  for (const job of jobs) {
    const owner = job.ownerScopedId
      ? agentMap.get(job.ownerScopedId)
      : job.ownerAgent
      ? agentMap.get(job.ownerAgent)
      : undefined;

    let cursor = new Date(rangeStart.getTime() - 60000); // 1 minute before range
    let count = 0;
    while (count < MAX_EVENTS_PER_SOURCE) {
      const next = computeNextCronRun(job.schedule, cursor);
      if (!next || next.getTime() >= rangeEnd.getTime()) break;
      if (next.getTime() >= rangeStart.getTime()) {
        events.push({
          id: `job:${job.scopedId}:${next.toISOString()}`,
          sourceType: "job",
          sourceId: job.scopedId,
          label: job.name,
          agentEmoji: owner?.emoji || "🤖",
          agentName: owner?.name || job.ownerAgent || "Unknown",
          agentSlug: owner?.slug || job.ownerAgent || "",
          enabled: job.enabled,
          cronExpr: job.schedule,
          time: next,
          jobRef: job,
          agentRef: owner,
        });
      }
      cursor = next;
      count++;
    }
  }

  // Heartbeats
  for (const agent of agents) {
    if (!agent.heartbeat) continue;

    let cursor = new Date(rangeStart.getTime() - 60000);
    let count = 0;
    while (count < MAX_EVENTS_PER_SOURCE) {
      const next = computeNextCronRun(agent.heartbeat, cursor);
      if (!next || next.getTime() >= rangeEnd.getTime()) break;
      if (next.getTime() >= rangeStart.getTime()) {
        events.push({
          id: `hb:${agent.scopedId}:${next.toISOString()}`,
          sourceType: "heartbeat",
          sourceId: agent.scopedId,
          label: agent.name,
          agentEmoji: agent.emoji || "🤖",
          agentName: agent.name,
          agentSlug: agent.slug,
          enabled: agent.active,
          cronExpr: agent.heartbeat,
          time: next,
          agentRef: agent,
        });
      }
      cursor = next;
      count++;
    }
  }

  events.sort((a, b) => a.time.getTime() - b.time.getTime());
  return events;
}

/* ─── Date range helpers ─── */

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
  return d;
}

export function getViewRange(
  mode: "day" | "week" | "month",
  anchor: Date,
): { start: Date; end: Date } {
  if (mode === "day") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (mode === "week") {
    const start = getWeekStart(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  // month
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
}

/* ─── Agent color palette ─── */

const AGENT_COLORS = [
  { bg: "rgba(139, 94, 60, 0.18)", text: "rgb(139, 94, 60)" },
  { bg: "rgba(180, 120, 70, 0.18)", text: "rgb(160, 100, 50)" },
  { bg: "rgba(100, 140, 80, 0.18)", text: "rgb(80, 120, 60)" },
  { bg: "rgba(70, 100, 150, 0.18)", text: "rgb(60, 90, 140)" },
  { bg: "rgba(150, 80, 100, 0.18)", text: "rgb(140, 70, 90)" },
  { bg: "rgba(120, 100, 150, 0.18)", text: "rgb(100, 80, 130)" },
  { bg: "rgba(150, 130, 60, 0.18)", text: "rgb(130, 110, 40)" },
  { bg: "rgba(80, 130, 130, 0.18)", text: "rgb(60, 110, 110)" },
];

export function getAgentColor(slug: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}
