import path from "path";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { fileExists, readFileContent } from "@/lib/storage/fs-operations";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import { normalizeCabinetPath } from "@/lib/cabinets/paths";
import { getDefaultProviderId } from "./provider-runtime";
import { resolveEnabledProviderId } from "./provider-settings";
import type { AgentPersona } from "./persona-manager";

export const SEEDED_AGENT_LIBRARY_DIR = path.join(DATA_DIR, ".agents", ".library");
export const SOURCE_AGENT_LIBRARY_DIR = path.join(
  PROJECT_ROOT,
  "src",
  "lib",
  "agents",
  "library"
);

export const MANDATORY_AGENT_SLUGS = ["ceo", "editor"] as const;

export async function resolveAgentLibraryDir(): Promise<string | null> {
  for (const dir of [SEEDED_AGENT_LIBRARY_DIR, SOURCE_AGENT_LIBRARY_DIR]) {
    if (await fileExists(dir)) {
      return dir;
    }
  }

  return null;
}

export async function resolveAgentTemplateDir(slug: string): Promise<string | null> {
  const libraryDir = await resolveAgentLibraryDir();
  if (!libraryDir) return null;

  const templateDir = path.join(libraryDir, slug);
  if (!(await fileExists(path.join(templateDir, "persona.md")))) {
    return null;
  }

  return templateDir;
}

export function mergeMandatoryAgentSlugs(selectedAgents: string[]): string[] {
  return Array.from(new Set([...MANDATORY_AGENT_SLUGS, ...selectedAgents]));
}

export async function readLibraryPersona(
  slug: string,
  cabinetPath?: string
): Promise<AgentPersona | null> {
  const templateDir = await resolveAgentTemplateDir(slug);
  if (!templateDir) return null;

  const raw = await readFileContent(path.join(templateDir, "persona.md"));
  const { data, content } = matter(raw);

  return {
    name: (data.name as string) || slug,
    role: (data.role as string) || "",
    provider: resolveEnabledProviderId(
      typeof data.provider === "string" ? data.provider : getDefaultProviderId()
    ),
    heartbeat: (data.heartbeat as string) || "0 8 * * *",
    budget: (data.budget as number) || 100,
    active: data.active !== false,
    workdir: (data.workdir as string) || "/data",
    focus: (data.focus as string[]) || [],
    tags: (data.tags as string[]) || [],
    emoji: (data.emoji as string) || "🤖",
    department: (data.department as string) || "general",
    type: (data.type as AgentPersona["type"]) || "specialist",
    goals: (data.goals as AgentPersona["goals"]) || [],
    channels: (data.channels as string[]) || ["general"],
    workspace: (data.workspace as string) || "workspace",
    setupComplete: false,
    cabinetPath: normalizeCabinetPath(cabinetPath, true),
    slug,
    body: content.trim(),
  };
}
