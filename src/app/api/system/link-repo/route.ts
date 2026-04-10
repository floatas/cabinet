import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import simpleGit from "simple-git";
import { NextRequest, NextResponse } from "next/server";
import {
  resolveContentPath,
  sanitizeFilename,
} from "@/lib/storage/path-utils";
import { ensureDirectory, fileExists, writeFileContent } from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";

export const dynamic = "force-dynamic";

interface LinkRepoRequest {
  localPath?: string;
  name?: string;
  remote?: string;
  description?: string;
  parentPath?: string;
}

async function detectGitMetadata(localPath: string): Promise<{
  isRepo: boolean;
  branch?: string;
  remote?: string;
}> {
  try {
    const git = simpleGit(localPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return { isRepo: false };

    const branchSummary = await git.branchLocal();
    const remotes = await git.getRemotes(true);
    const preferredRemote =
      remotes.find((remote) => remote.name === "origin") || remotes[0];

    return {
      isRepo: true,
      branch: branchSummary.current || undefined,
      remote:
        preferredRemote?.refs.push ||
        preferredRemote?.refs.fetch ||
        undefined,
    };
  } catch {
    return { isRepo: false };
  }
}

function buildIndexContent({
  name,
  localPath,
  isRepo,
  remote,
  branch,
  source,
  description,
}: {
  name: string;
  localPath: string;
  isRepo: boolean;
  remote?: string;
  branch?: string;
  source?: "local" | "both";
  description?: string;
}) {
  const frontmatter = {
    title: name,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    tags: isRepo ? ["repo"] : ["knowledge"],
  };

  const lines: string[] = [
    `# ${name}`,
    "",
    description || (isRepo
      ? "This KB folder links to an external code repository."
      : "This KB folder links to an external directory."),
    "",
    `- Local path: \`${localPath}\``,
  ];

  if (isRepo) {
    lines.push(remote ? `- Remote: \`${remote}\`` : "- Remote: not detected");
    lines.push(`- Branch: \`${branch}\``);
    lines.push(`- Source: \`${source}\``);
    lines.push("");
    lines.push("A `source` symlink and `.repo.yaml` were created so agents can read the source code in context.");
  } else {
    lines.push("");
    lines.push("A `source` symlink was created so the folder contents are accessible from the Knowledge Base.");
  }

  return matter.stringify(`\n${lines.join("\n")}\n`, frontmatter);
}

export async function POST(req: NextRequest) {
  let targetDir = "";

  try {
    const body = (await req.json()) as LinkRepoRequest;
    const localPathInput = body.localPath?.trim();
    if (!localPathInput) {
      return NextResponse.json(
        { error: "localPath is required" },
        { status: 400 }
      );
    }

    const localPath = path.resolve(localPathInput);
    const stat = await fs.stat(localPath).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json(
        { error: "Local path must be an existing directory." },
        { status: 400 }
      );
    }

    const derivedName = body.name?.trim() || path.basename(localPath);
    const folderName = sanitizeFilename(derivedName);
    if (!folderName) {
      return NextResponse.json(
        { error: "A valid repo name is required." },
        { status: 400 }
      );
    }

    const parentPath = body.parentPath?.trim() || "";
    const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName;
    targetDir = resolveContentPath(relativePath);
    if (await fileExists(targetDir)) {
      return NextResponse.json(
        { error: `A Knowledge Base folder named "${folderName}" already exists.` },
        { status: 409 }
      );
    }

    const detected = await detectGitMetadata(localPath);
    const isRepo = detected.isRepo || !!body.remote?.trim();
    const branch = detected.branch || "main";
    const remote = body.remote?.trim() || detected.remote;
    const source = remote ? "both" : "local";
    const description = body.description?.trim() || undefined;

    await ensureDirectory(targetDir);

    const indexPath = path.join(targetDir, "index.md");
    const symlinkPath = path.join(targetDir, "source");

    await writeFileContent(
      indexPath,
      buildIndexContent({
        name: derivedName,
        localPath,
        isRepo,
        remote,
        branch,
        source,
        description,
      })
    );

    if (isRepo) {
      const repoYamlPath = path.join(targetDir, ".repo.yaml");
      const repoConfig = {
        name: derivedName,
        local: localPath,
        ...(remote ? { remote } : {}),
        source,
        branch,
        ...(description ? { description } : {}),
      };
      await writeFileContent(
        repoYamlPath,
        yaml.dump(repoConfig, { lineWidth: -1, noRefs: true })
      );
    }

    await fs.symlink(
      localPath,
      symlinkPath,
      process.platform === "win32" ? "junction" : "dir"
    );

    autoCommit(relativePath, "Add");

    return NextResponse.json({
      ok: true,
      path: relativePath,
    });
  } catch (error) {
    if (targetDir) {
      await fs.rm(targetDir, { recursive: true, force: true }).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
