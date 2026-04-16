"use client";

import { useState, useRef, useCallback, useMemo } from "react";

export interface MentionableItem {
  type: "page" | "agent";
  id: string; // path for pages, slug for agents
  label: string; // title for pages, name for agents
  sublabel: string; // path for pages, role for agents
  icon?: string; // emoji for agents
}

export interface ComposerPayload {
  message: string;
  mentionedPaths: string[];
  mentionedAgents: string[];
}

export interface UseComposerOptions {
  items?: MentionableItem[];
  onSubmit: (payload: ComposerPayload) => void | Promise<void>;
  disabled?: boolean;
  initialMentionedAgents?: string[];
}

export interface UseComposerReturn {
  input: string;
  setInput: (value: string) => void;
  mentions: { paths: string[]; agents: string[] };
  showDropdown: boolean;
  filteredItems: MentionableItem[];
  dropdownIndex: number;
  submitting: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  insertMention: (item: MentionableItem) => void;
  removeMention: (type: "page" | "agent", id: string) => void;
  submit: (directMessage?: string) => Promise<void>;
  reset: () => void;
}

export function useComposer({
  items = [],
  onSubmit,
  disabled = false,
  initialMentionedAgents,
}: UseComposerOptions): UseComposerReturn {
  const initialAgentsRef = useRef(initialMentionedAgents ?? []);
  const [input, setInput] = useState("");
  const [mentionedPaths, setMentionedPaths] = useState<string[]>([]);
  const [mentionedAgents, setMentionedAgents] = useState<string[]>(initialAgentsRef.current);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredItems = useMemo(() => {
    if (!mentionQuery && !showDropdown) return [];
    const q = mentionQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel.toLowerCase().includes(q)
    );
  }, [items, mentionQuery, showDropdown]);

  const findLabelForMention = useCallback(
    (type: "page" | "agent", id: string): string => {
      const item = items.find((i) => i.type === type && i.id === id);
      return item?.label || id;
    },
    [items]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const pos = e.target.selectionStart || 0;
      setInput(value);

      // Auto-remove mentions whose @Label no longer appears in the text
      setMentionedPaths((current) =>
        current.filter((path) => {
          const label = findLabelForMention("page", path);
          return value.includes(`@${label}`);
        })
      );
      setMentionedAgents((current) =>
        current.filter((slug) => {
          // Never auto-remove agents that were pre-selected as defaults
          if (initialAgentsRef.current.includes(slug)) return true;
          const label = findLabelForMention("agent", slug);
          return value.includes(`@${label}`);
        })
      );

      // Detect @ trigger
      const textBefore = value.slice(0, pos);
      const atIndex = textBefore.lastIndexOf("@");

      if (atIndex !== -1) {
        const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : " ";
        if (charBefore === " " || charBefore === "\n" || atIndex === 0) {
          const query = textBefore.slice(atIndex + 1);
          if (!query.includes(" ") && !query.includes("\n")) {
            setShowDropdown(true);
            setMentionQuery(query);
            setMentionIndex(0);
            setMentionStartPos(atIndex);
            return;
          }
        }
      }
      setShowDropdown(false);
    },
    [findLabelForMention]
  );

  const insertMention = useCallback(
    (item: MentionableItem) => {
      const before = input.slice(0, mentionStartPos);
      const cursorPos = textareaRef.current?.selectionStart || input.length;
      const after = input.slice(cursorPos);
      const newInput = `${before}@${item.label} ${after}`;
      setInput(newInput);

      if (item.type === "page") {
        setMentionedPaths((prev) =>
          prev.includes(item.id) ? prev : [...prev, item.id]
        );
      } else {
        setMentionedAgents((prev) =>
          prev.includes(item.id) ? prev : [...prev, item.id]
        );
      }

      setShowDropdown(false);
      setMentionQuery("");

      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = before.length + item.label.length + 2; // +2 for @ and space
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
          textareaRef.current.focus();
        }
      }, 0);
    },
    [input, mentionStartPos]
  );

  const removeMention = useCallback(
    (type: "page" | "agent", id: string) => {
      if (type === "page") {
        setMentionedPaths((prev) => prev.filter((p) => p !== id));
      } else {
        setMentionedAgents((prev) => prev.filter((a) => a !== id));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setInput("");
    setMentionedPaths([]);
    setMentionedAgents(initialAgentsRef.current);
    setShowDropdown(false);
    setMentionQuery("");
    setMentionIndex(0);
    setSubmitting(false);
  }, []);

  const submit = useCallback(async (directMessage?: string) => {
    const msg = directMessage?.trim() || input.trim();
    if (!msg || disabled || submitting) return;

    const paths = [...mentionedPaths];
    const agents = [...mentionedAgents];

    setSubmitting(true);
    try {
      await onSubmit({ message: msg, mentionedPaths: paths, mentionedAgents: agents });
      setInput("");
      setMentionedPaths([]);
      setMentionedAgents([]);
    } catch {
      // Restore input on failure
      setInput(msg);
      setMentionedPaths(paths);
      setMentionedAgents(agents);
    } finally {
      setSubmitting(false);
    }
  }, [input, disabled, submitting, mentionedPaths, mentionedAgents, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // When mention dropdown is open, handle navigation
      if (showDropdown && filteredItems.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, filteredItems.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filteredItems[mentionIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowDropdown(false);
          return;
        }
      }

      // Shift+Enter: newline
      if (e.key === "Enter" && e.shiftKey) {
        return; // default behavior: insert newline
      }

      // Enter (no modifier): submit
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void submit();
        return;
      }
    },
    [showDropdown, filteredItems, mentionIndex, insertMention, submit]
  );

  return {
    input,
    setInput,
    mentions: { paths: mentionedPaths, agents: mentionedAgents },
    showDropdown,
    filteredItems,
    dropdownIndex: mentionIndex,
    submitting,
    textareaRef,
    handleChange,
    handleKeyDown,
    insertMention,
    removeMention,
    submit,
    reset,
  };
}
