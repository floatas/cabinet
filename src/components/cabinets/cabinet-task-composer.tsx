"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getGreeting } from "./cabinet-utils";
import { useTreeStore } from "@/stores/tree-store";
import type { TreeNode } from "@/types";
import type { CabinetAgentSummary } from "@/types/cabinets";

type MentionItem =
  | { type: "agent"; agent: CabinetAgentSummary }
  | { type: "page"; path: string; title: string };

function flattenTree(nodes: TreeNode[]): { path: string; title: string }[] {
  const result: { path: string; title: string }[] = [];
  function walk(list: TreeNode[]) {
    for (const node of list) {
      result.push({ path: node.path, title: node.frontmatter?.title || node.name });
      if (node.children) walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

export function CabinetTaskComposer({
  cabinetPath,
  agents,
  displayName,
  cabinetName,
  cabinetDescription,
  requestedAgent,
  focusRequest,
  onNavigate,
}: {
  cabinetPath: string;
  agents: CabinetAgentSummary[];
  displayName: string;
  cabinetName?: string;
  cabinetDescription?: string;
  requestedAgent?: CabinetAgentSummary | null;
  focusRequest?: number;
  onNavigate: (agentSlug: string, agentCabinetPath: string, conversationId: string) => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState<CabinetAgentSummary | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionedPaths, setMentionedPaths] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const treeNodes = useTreeStore((s) => s.nodes);
  const pages = useMemo(() => flattenTree(treeNodes), [treeNodes]);

  // Auto-select first active own-cabinet agent on load
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      const first =
        agents.find((a) => a.cabinetDepth === 0 && a.active) ||
        agents.find((a) => a.active) ||
        agents[0];
      setSelectedAgent(first);
    }
  }, [agents, selectedAgent]);

  useEffect(() => {
    if (!requestedAgent) return;
    setSelectedAgent(requestedAgent);
  }, [requestedAgent]);

  useEffect(() => {
    if (!focusRequest) return;
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);
  }, [focusRequest]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 72)}px`;
  }, [prompt]);

  const greeting = getGreeting();
  const activeAgents = agents.filter((a) => a.active);
  const assignableAgents = activeAgents.length > 0 ? activeAgents : agents;

  const filteredMentions: MentionItem[] = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const agentItems: MentionItem[] = assignableAgents
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q)
      )
      .map((a) => ({ type: "agent", agent: a }));
    const pageItems: MentionItem[] = pages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((p) => ({ type: "page", path: p.path, title: p.title }));
    return [...agentItems, ...pageItems].slice(0, 8);
  }, [mentionQuery, assignableAgents, pages]);

  function handlePromptChange(value: string, cursorPosition: number) {
    setPrompt(value);
    const textBefore = value.slice(0, cursorPosition);
    const atIndex = textBefore.lastIndexOf("@");

    if (atIndex === -1) {
      setMentionQuery(null);
      return;
    }

    const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : " ";
    if (charBefore !== " " && charBefore !== "\n" && atIndex !== 0) {
      setMentionQuery(null);
      return;
    }

    const query = textBefore.slice(atIndex + 1);
    if (query.includes(" ") || query.includes("\n")) {
      setMentionQuery(null);
      return;
    }

    setMentionStart(atIndex);
    setMentionQuery(query);
    setMentionIndex(0);
  }

  function selectMention(item: MentionItem) {
    if (item.type === "agent") {
      setSelectedAgent(item.agent);
    } else {
      if (!mentionedPaths.includes(item.path)) {
        setMentionedPaths((prev) => [...prev, item.path]);
      }
    }
    setMentionQuery(null);
    setPrompt((current) => {
      const before = current.slice(0, mentionStart);
      const after = current.slice(mentionStart + (mentionQuery?.length ?? 0) + 1);
      const label = item.type === "agent" ? "" : `@${item.title} `;
      return `${before}${label}${after}`.replace(/\s{2,}/g, " ").trimStart();
    });
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function submit(text: string) {
    if (!text.trim() || submitting || !selectedAgent) return;
    setSubmitting(true);
    try {
      const agentCabinetPath = selectedAgent.cabinetPath || cabinetPath;
      const res = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: selectedAgent.slug,
          userMessage: text.trim(),
          mentionedPaths,
          cabinetPath: agentCabinetPath,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrompt("");
        setMentionedPaths([]);
        onNavigate(selectedAgent.slug, agentCabinetPath, data.conversation?.id);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  const placeholder = selectedAgent
    ? `What should ${selectedAgent.name} work on?`
    : "Choose an agent and describe the next task.";

  return (
    <div ref={rootRef} className="space-y-5">
      <div className="space-y-2">
        {cabinetName ? (
          <>
            <h1 className="font-body-serif text-[2.2rem] leading-none tracking-tight text-foreground">
              {cabinetName}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {cabinetDescription || `${greeting}, ${displayName}. What are we working on today?`}
            </p>
          </>
        ) : (
          <h1 className="font-body-serif text-[1.45rem] leading-tight tracking-tight text-foreground sm:text-[1.85rem]">
            {greeting}, {displayName}. What are we working on today?
          </h1>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) =>
              handlePromptChange(e.target.value, e.target.selectionStart || e.target.value.length)
            }
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredMentions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((current) => (current + 1) % filteredMentions.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((current) =>
                    current === 0 ? filteredMentions.length - 1 : current - 1
                  );
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const item = filteredMentions[mentionIndex];
                  if (item) selectMention(item);
                  return;
                }
                if (e.key === "Escape") {
                  setMentionQuery(null);
                  return;
                }
              }

              if (e.key === "Enter" && e.shiftKey) {
                return; // default: insert newline
              }
              if (e.key === "Enter") {
                e.preventDefault();
                void submit(prompt);
              }
            }}
            placeholder={placeholder}
            disabled={submitting || !selectedAgent}
            rows={1}
            className={cn(
              "min-h-[72px] w-full rounded-xl border border-border bg-card px-4 py-4 pr-16",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "shadow-sm resize-none",
              (!selectedAgent || submitting) && "opacity-60"
            )}
          />

          {mentionQuery !== null ? (
            <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border border-border bg-popover shadow-lg">
              {filteredMentions.length > 0 ? (
                <div className="py-1.5">
                  {filteredMentions.map((item, index) => (
                    <button
                      key={item.type === "agent" ? item.agent.scopedId : item.path}
                      type="button"
                      onClick={() => selectMention(item)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        index === mentionIndex ? "bg-muted/70" : "hover:bg-muted/40"
                      )}
                    >
                      {item.type === "agent" ? (
                        <>
                          <span className="text-base leading-none">{item.agent.emoji || "🤖"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{item.agent.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.agent.role}
                              {item.agent.inherited ? ` · ${item.agent.cabinetName}` : ""}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{item.path}</p>
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No agents or pages match.
                </p>
              )}
            </div>
          ) : null}

          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
            <button
              type="button"
              onClick={() => void submit(prompt)}
              disabled={!prompt.trim() || submitting || !selectedAgent}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                prompt.trim() && !submitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              )}
              aria-label="Start conversation"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {mentionedPaths.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {mentionedPaths.map((path) => (
              <span
                key={path}
                className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <FileText className="h-3 w-3" />
                {path.split("/").pop()?.replace(/-/g, " ") || path}
                <button
                  type="button"
                  onClick={() => setMentionedPaths((prev) => prev.filter((p) => p !== path))}
                  className="ml-0.5 text-muted-foreground/50 hover:text-foreground"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-muted-foreground/50">
            use <kbd className="rounded border border-border/50 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">@</kbd> to mention
          </span>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/50">
            <kbd className="rounded border border-border/50 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">Shift</kbd>
            <span>+</span>
            <kbd className="rounded border border-border/50 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            <span className="ml-0.5">new line</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <Select
            items={assignableAgents.map((agent) => ({
              label: agent.name,
              value: agent.scopedId,
            }))}
            value={selectedAgent?.scopedId || null}
            onValueChange={(value) => {
              const agent = assignableAgents.find((entry) => entry.scopedId === value) || null;
              setSelectedAgent(agent);
            }}
            disabled={assignableAgents.length === 0}
          >
            <SelectTrigger className="min-w-[220px] rounded-full bg-background px-3">
              <SelectValue placeholder="No visible agents" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {assignableAgents.map((agent) => (
                  <SelectItem key={agent.scopedId} value={agent.scopedId}>
                    <span className="text-sm leading-none">{agent.emoji || "🤖"}</span>
                    <span className="truncate">
                      {agent.name}
                      {agent.inherited ? ` · ${agent.cabinetName}` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
