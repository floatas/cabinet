"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";

interface LinkRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath?: string;
}

function basenameForPath(value: string): string {
  const normalized = value.trim().replace(/[\\/]+$/, "");
  if (!normalized) return "";
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

export function LinkRepoDialog({ open, onOpenChange, parentPath }: LinkRepoDialogProps) {
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectPage = useTreeStore((s) => s.selectPage);
  const loadPage = useEditorStore((s) => s.loadPage);

  const [localPath, setLocalPath] = useState("");
  const [name, setName] = useState("");
  const [remote, setRemote] = useState("");
  const [description, setDescription] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [devExpanded, setDevExpanded] = useState(false);

  useEffect(() => {
    if (!open) {
      setLocalPath("");
      setName("");
      setRemote("");
      setDescription("");
      setBrowsing(false);
      setCreating(false);
      setError("");
      setDevExpanded(false);
    }
  }, [open]);

  async function handleBrowse() {
    setBrowsing(true);
    setError("");

    try {
      const res = await fetch("/api/system/pick-directory", {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to open folder picker.");
      }

      if (data?.cancelled || !data?.path) {
        return;
      }

      setLocalPath(data.path);
      setName((current) => current || basenameForPath(data.path));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to open folder picker."
      );
    } finally {
      setBrowsing(false);
    }
  }

  async function handleCreate() {
    if (!localPath.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/system/link-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localPath: localPath.trim(),
          name: name.trim() || basenameForPath(localPath),
          remote: remote.trim() || undefined,
          description: description.trim() || undefined,
          parentPath: parentPath || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load knowledge.");
      }

      await loadTree();
      selectPage(data.path);
      await loadPage(data.path);
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load knowledge."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Knowledge</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-xs text-muted-foreground">
            Point Cabinet to any folder on your machine. Its contents will appear
            in the Knowledge Base and be available to AI agents as context.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Folder
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="/Users/me/Documents/my-folder"
                value={localPath}
                onChange={(event) => setLocalPath(event.target.value)}
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleBrowse()}
                disabled={browsing || creating}
              >
                {browsing ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FolderOpen data-icon="inline-start" />
                )}
                Browse
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              placeholder={basenameForPath(localPath) || "My Folder"}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {/* ── For Developers ─────────────────────────────── */}
          <div className="border border-border rounded-md">
            <button
              type="button"
              onClick={() => setDevExpanded(!devExpanded)}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 transition-transform duration-150",
                  devExpanded && "rotate-90"
                )}
              />
              For Developers
            </button>
            {devExpanded && (
              <div className="flex flex-col gap-3 px-3 pb-3">
                <p className="text-xs text-muted-foreground">
                  If the folder is a git repo, Cabinet auto-detects the branch
                  and remote. A <code>.repo.yaml</code> config and
                  a <code>source</code> symlink are created so agents can read
                  the source code in context.
                </p>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Remote URL
                  </label>
                  <Input
                    placeholder="Auto-detect from git remote (optional)"
                    value={remote}
                    onChange={(event) => setRemote(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Description
                  </label>
                  <Input
                    placeholder="Optional short summary for agents"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!localPath.trim() || creating}>
              {creating ? "Loading..." : "Load"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
