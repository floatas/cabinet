"use client";

import { useMemo } from "react";
import { CopyButton } from "./copy-button";

type Block =
  | { type: "text"; content: string }
  | { type: "diff"; header: string; lines: DiffLine[] }
  | { type: "code"; lang: string; content: string }
  | { type: "cabinet"; fields: { label: string; value: string }[] }
  | { type: "structured"; label: string; value: string }
  | { type: "tokens"; value: string };

type DiffLine = { kind: "add" | "remove" | "hunk" | "header" | "plain"; text: string };

const DIFF_START = /^diff --git /;
const EMBEDDED_DIFF = /diff --git a\//;
const STRUCTURED_RE = /^(SUMMARY|CONTEXT|CONTEXT_UPDATE|ARTIFACT|DECISION|LEARNING|GOAL_UPDATE|MESSAGE_TO)\s*(?:\[([^\]]*)\])?:\s*(.*)$/;
const TOKENS_RE = /^[\d,]+$/;

/**
 * Pre-process: some transcripts glue text directly into a diff header
 * e.g. "...targets Bidiff --git a/foo b/foo" — split into two lines.
 */
function preprocess(text: string): string {
  return text
    .split("\n")
    .flatMap((line) => {
      if (DIFF_START.test(line)) return [line];
      const idx = line.indexOf("diff --git a/");
      if (idx > 0) {
        return [line.substring(0, idx), line.substring(idx)];
      }
      return [line];
    })
    .join("\n");
}

function isDiffStart(line: string): boolean {
  return DIFF_START.test(line);
}

function isDiffContentLine(line: string): boolean {
  if (line.startsWith("+") || line.startsWith("-")) return true;
  if (line.startsWith("@@")) return true;
  if (/^(index |new file|deleted file|old mode|new mode|similarity|rename|copy)/.test(line)) return true;
  if (line.startsWith("+++") || line.startsWith("---")) return true;
  return false;
}

function parseDiffBlock(lines: string[], startIdx: number): { block: Block; endIdx: number } {
  const header = lines[startIdx];
  const diffLines: DiffLine[] = [];
  let i = startIdx + 1;

  while (i < lines.length) {
    const line = lines[i];
    if (isDiffStart(line)) break;

    if (line.startsWith("+++") || line.startsWith("---")) {
      diffLines.push({ kind: "header", text: line });
    } else if (line.startsWith("@@")) {
      diffLines.push({ kind: "hunk", text: line });
    } else if (line.startsWith("+")) {
      diffLines.push({ kind: "add", text: line });
    } else if (line.startsWith("-")) {
      diffLines.push({ kind: "remove", text: line });
    } else if (/^(index |new file|deleted file|old mode|new mode|similarity|rename|copy)/.test(line)) {
      diffLines.push({ kind: "header", text: line });
    } else if (line.startsWith(" ") || line === "") {
      const hasHunks = diffLines.some((d) => d.kind === "hunk");
      if (hasHunks) {
        diffLines.push({ kind: "plain", text: line });
      } else {
        diffLines.push({ kind: "header", text: line });
      }
    } else {
      break;
    }
    i++;
  }

  return { block: { type: "diff", header, lines: diffLines }, endIdx: i };
}

/**
 * Parse ``` ... ``` blocks. If contents are all structured lines (SUMMARY/CONTEXT/ARTIFACT),
 * return a "cabinet" block instead of a code block.
 */
function parseCodeBlock(lines: string[], startIdx: number): { block: Block; endIdx: number } | null {
  const match = lines[startIdx].match(/^```(\w*)$/);
  if (!match) return null;

  const lang = match[1] || "text";
  const codeLines: string[] = [];
  let i = startIdx + 1;

  while (i < lines.length) {
    if (lines[i] === "```") {
      // Check if all non-empty lines are structured metadata
      const nonEmpty = codeLines.filter((l) => l.trim());
      const allStructured = nonEmpty.length > 0 && nonEmpty.every((l) => STRUCTURED_RE.test(l));

      if (allStructured) {
        const fields = nonEmpty.map((l) => {
          const m = l.match(STRUCTURED_RE)!;
          return { label: m[2] ? `${m[1]} [${m[2]}]` : m[1], value: m[3] };
        });
        return { block: { type: "cabinet", fields }, endIdx: i + 1 };
      }

      return { block: { type: "code", lang, content: codeLines.join("\n") }, endIdx: i + 1 };
    }
    codeLines.push(lines[i]);
    i++;
  }

  return null;
}

function parseStructuredLine(line: string): Block | null {
  const match = line.match(/^(SUMMARY|CONTEXT|CONTEXT_UPDATE|ARTIFACT|DECISION|LEARNING|GOAL_UPDATE|MESSAGE_TO)\s*(?:\[([^\]]*)\])?:\s+(.*)$/);
  if (!match) return null;
  const label = match[2] ? `${match[1]} [${match[2]}]` : match[1];
  return { type: "structured", label, value: match[3] };
}

function parseTranscript(raw: string): Block[] {
  const text = preprocess(raw);
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let textBuf: string[] = [];

  function flushText() {
    if (textBuf.length > 0) {
      const content = textBuf.join("\n").trim();
      if (!content) { textBuf = []; return; }

      // Detect orphaned diff lines (from truncated/split diffs)
      const nonEmpty = textBuf.filter((l) => l.trim());
      const diffLikeCount = nonEmpty.filter((l) => isDiffContentLine(l)).length;
      if (nonEmpty.length > 0 && diffLikeCount / nonEmpty.length >= 0.5) {
        const diffLines: DiffLine[] = textBuf
          .filter((l) => l.trim())
          .map((l) => {
            if (l.startsWith("+")) return { kind: "add" as const, text: l };
            if (l.startsWith("-")) return { kind: "remove" as const, text: l };
            if (l.startsWith("@@")) return { kind: "hunk" as const, text: l };
            return { kind: "plain" as const, text: l };
          });
        blocks.push({ type: "diff", header: "", lines: diffLines });
      } else {
        blocks.push({ type: "text", content });
      }
      textBuf = [];
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Diff blocks
    if (isDiffStart(line)) {
      flushText();
      const result = parseDiffBlock(lines, i);
      blocks.push(result.block);
      i = result.endIdx;
      continue;
    }

    // Fenced code / cabinet blocks
    if (/^```/.test(line)) {
      const result = parseCodeBlock(lines, i);
      if (result) {
        flushText();
        blocks.push(result.block);
        i = result.endIdx;
        continue;
      }
    }

    // Structured metadata lines (standalone)
    const structured = parseStructuredLine(line);
    if (structured) {
      flushText();
      blocks.push(structured);
      i++;
      continue;
    }

    // Token count at end of transcript (e.g. "65,115")
    if (TOKENS_RE.test(line.trim()) && i >= lines.length - 3) {
      flushText();
      blocks.push({ type: "tokens", value: line.trim() });
      i++;
      continue;
    }

    textBuf.push(line);
    i++;
  }

  flushText();
  return blocks;
}

/** Render markdown-style links and inline code in text */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match [text](url) links and `inline code`
  const re = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[1] && match[2]) {
      // Link
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code key={match.index} className="rounded bg-background px-1 py-0.5 text-[11px] text-foreground">
          {match[3]}
        </code>
      );
    }
    lastIdx = re.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [text];
}

function DiffBlock({ block }: { block: Extract<Block, { type: "diff" }> }) {
  const fileMatch = block.header.match(/^diff --git a\/(.+?) b\//);
  const fileName = fileMatch ? fileMatch[1] : "";
  const additions = block.lines.filter((l) => l.kind === "add").length;
  const removals = block.lines.filter((l) => l.kind === "remove").length;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border">
      {fileName && (
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
          <span className="font-mono text-[11px] font-medium text-foreground">{fileName}</span>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {additions > 0 && <span className="text-emerald-400">+{additions}</span>}
            {removals > 0 && <span className="text-red-400">-{removals}</span>}
          </div>
        </div>
      )}
      <div className="overflow-x-auto bg-muted/10 font-mono text-[11px] leading-[1.6]">
        {block.lines.map((line, idx) => {
          let className = "px-3 whitespace-pre-wrap break-all ";
          switch (line.kind) {
            case "add":
              className += "bg-emerald-500/10 text-emerald-400";
              break;
            case "remove":
              className += "bg-red-500/10 text-red-400";
              break;
            case "hunk":
              className += "bg-blue-500/8 text-blue-400/80";
              break;
            case "header":
              className += "text-muted-foreground/60";
              break;
            default:
              className += "text-foreground/70";
          }
          return (
            <div key={idx} className={className}>
              {line.text || "\u00A0"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CodeBlock({ block }: { block: Extract<Block, { type: "code" }> }) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border">
      {block.lang && block.lang !== "text" && (
        <div className="border-b border-border bg-muted/40 px-3 py-1">
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{block.lang}</span>
        </div>
      )}
      <pre className="overflow-x-auto bg-muted/10 p-3 font-mono text-[11px] leading-[1.6] text-foreground/85">
        {block.content}
      </pre>
    </div>
  );
}

const LABEL_COLORS: Record<string, string> = {
  SUMMARY: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  CONTEXT: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CONTEXT_UPDATE: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ARTIFACT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  DECISION: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  LEARNING: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  GOAL_UPDATE: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  MESSAGE_TO: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

function StructuredBadge({ label, value }: { label: string; value: string }) {
  const baseLabel = label.split(" ")[0];
  const colorClass = LABEL_COLORS[baseLabel] || "bg-muted/30 text-muted-foreground border-border";

  return (
    <div className="my-1.5 flex items-start gap-2">
      <span className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
        {label}
      </span>
      <span className="text-[12px] leading-relaxed text-foreground/85">
        {renderInlineFormatting(value)}
      </span>
    </div>
  );
}

function CabinetBlock({ block }: { block: Extract<Block, { type: "cabinet" }> }) {
  return (
    <div className="my-3 rounded-xl border border-border bg-muted/10 p-3 space-y-1">
      {block.fields.map((field, idx) => (
        <StructuredBadge key={idx} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

function TextBlock({ content }: { content: string }) {
  // Render each line, applying inline formatting
  const lines = content.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground my-1">
      {lines.map((line, idx) => (
        <div key={idx}>{renderInlineFormatting(line)}</div>
      ))}
    </div>
  );
}

function TokensBadge({ value }: { value: string }) {
  return (
    <div className="mt-4 flex justify-end">
      <span className="rounded-md border border-border bg-muted/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
        {value} tokens
      </span>
    </div>
  );
}

export function TranscriptViewer({ text }: { text: string }) {
  const blocks = useMemo(() => parseTranscript(text), [text]);

  return (
    <section id="transcript" className="scroll-mt-6 rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Transcript</h2>
          <p className="text-sm text-muted-foreground">
            Full session transcript for debugging, review, or copy-paste.
          </p>
        </div>
        <CopyButton text={text} />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-muted/30 p-4">
        {blocks.map((block, idx) => {
          switch (block.type) {
            case "diff":
              return <DiffBlock key={idx} block={block} />;
            case "code":
              return <CodeBlock key={idx} block={block} />;
            case "cabinet":
              return <CabinetBlock key={idx} block={block} />;
            case "structured":
              return <StructuredBadge key={idx} label={block.label} value={block.value} />;
            case "tokens":
              return <TokensBadge key={idx} value={block.value} />;
            case "text":
              return <TextBlock key={idx} content={block.content} />;
          }
        })}
      </div>
    </section>
  );
}
