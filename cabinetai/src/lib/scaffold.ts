import fs from "fs";
import path from "path";
import { ensureDir, findCabinetRoot, slugify } from "./paths.js";
import {
  writeCabinetManifest,
  type CabinetManifest,
} from "./cabinet-manifest.js";

export interface ScaffoldCabinetDirOptions {
  targetDir: string;
  name: string;
  kind: "root" | "child";
  preserveIndex?: boolean;
}

export interface ResolvedCabinetRoot {
  cabinetDir: string;
  name: string;
  bootstrapped: boolean;
}

function buildCabinetManifest(
  name: string,
  kind: "root" | "child"
): CabinetManifest {
  const slug = slugify(name) || "cabinet";
  const manifest: CabinetManifest = {
    schemaVersion: 1,
    id: slug,
    name,
    kind,
    version: "0.1.0",
    description: "",
    entry: "index.md",
  };

  if (kind === "child") {
    manifest.parent = {
      shared_context: [],
    };
    manifest.access = {
      mode: "subtree-plus-parent-brief",
    };
  }

  return manifest;
}

export function inferCabinetName(targetDir: string): string {
  const base = path.basename(path.resolve(targetDir)).trim();
  if (!base || base === path.parse(targetDir).root) {
    return "Cabinet";
  }

  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function scaffoldCabinetDir(
  options: ScaffoldCabinetDirOptions
): CabinetManifest {
  const {
    targetDir,
    name,
    kind,
    preserveIndex = false,
  } = options;

  ensureDir(targetDir);
  ensureDir(path.join(targetDir, ".agents"));
  ensureDir(path.join(targetDir, ".jobs"));
  ensureDir(path.join(targetDir, ".cabinet-state"));

  const manifest = buildCabinetManifest(name, kind);
  writeCabinetManifest(targetDir, manifest);

  const indexPath = path.join(targetDir, "index.md");
  if (!preserveIndex || !fs.existsSync(indexPath)) {
    const now = new Date().toISOString();
    const indexContent = [
      "---",
      `title: ${name}`,
      `created: '${now}'`,
      `modified: '${now}'`,
      "tags: []",
      "order: 1",
      "---",
      "",
      `# ${name}`,
      "",
    ].join("\n");

    fs.writeFileSync(indexPath, indexContent, "utf8");
  }

  return manifest;
}

export function resolveOrBootstrapCabinetRoot(
  startDir = process.cwd()
): ResolvedCabinetRoot {
  const cabinetDir = findCabinetRoot(startDir);
  if (cabinetDir) {
    return {
      cabinetDir,
      name: inferCabinetName(cabinetDir),
      bootstrapped: false,
    };
  }

  const targetDir = path.resolve(startDir);
  const name = inferCabinetName(targetDir);
  scaffoldCabinetDir({
    targetDir,
    name,
    kind: "root",
    preserveIndex: true,
  });

  return {
    cabinetDir: targetDir,
    name,
    bootstrapped: true,
  };
}
