import path from "path";
import fs from "fs/promises";
import yaml from "js-yaml";

export interface ScaffoldCabinetOptions {
  name: string;
  kind: "root" | "child";
  description?: string;
  /** Extra markdown content written after the H1 in index.md */
  body?: string;
  tags?: string[];
  /**
   * When true, existing .cabinet and index.md are not overwritten.
   * Useful for re-running onboarding on an already-initialized directory.
   */
  skipExisting?: boolean;
}

/**
 * Bootstrap the canonical cabinet directory structure:
 *   .cabinet          — YAML identity manifest
 *   index.md          — entry point
 *   .agents/          — agent personas
 *   .jobs/            — scheduled automations
 *   .cabinet-state/   — runtime state
 */
export async function scaffoldCabinet(
  targetDir: string,
  options: ScaffoldCabinetOptions
): Promise<void> {
  const { name, kind, description = "", body = "", tags = [], skipExisting = false } = options;

  // Directories — always idempotent
  await fs.mkdir(path.join(targetDir, ".agents"), { recursive: true });
  await fs.mkdir(path.join(targetDir, ".jobs"), { recursive: true });
  await fs.mkdir(path.join(targetDir, ".cabinet-state"), { recursive: true });

  // .cabinet manifest
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const manifest = {
    schemaVersion: 1,
    id: `${slug}-${kind}`,
    name,
    kind,
    version: "0.1.0",
    description: description || `${name} cabinet.`,
    entry: "index.md",
  };

  const writeManifest = () =>
    fs.writeFile(
      path.join(targetDir, ".cabinet"),
      yaml.dump(manifest, { lineWidth: -1 }),
      "utf-8"
    );

  if (skipExisting) {
    await writeManifest().catch(() => {});
  } else {
    await writeManifest();
  }

  // index.md
  const now = new Date().toISOString();
  const frontmatterLines = [
    "---",
    `title: "${name}"`,
    `created: "${now}"`,
    `modified: "${now}"`,
  ];
  if (tags.length > 0) {
    frontmatterLines.push("tags:");
    for (const tag of tags) frontmatterLines.push(`  - ${tag}`);
  }
  frontmatterLines.push("---");

  const bodyLines = ["", `# ${name}`, ""];
  if (body) bodyLines.push(body, "");

  const indexContent = [...frontmatterLines, ...bodyLines].join("\n");

  const writeIndex = () =>
    fs.writeFile(
      path.join(targetDir, "index.md"),
      indexContent,
      skipExisting ? { flag: "wx" } : "utf-8"
    );

  if (skipExisting) {
    await writeIndex().catch(() => {});
  } else {
    await writeIndex();
  }
}
