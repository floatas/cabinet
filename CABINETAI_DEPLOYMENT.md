# cabinetai — Deployment Manual

## Overview

`cabinetai` is the runtime CLI for Cabinet. It manages the app installation, creates cabinets, and starts the server — all from a single command.

**Architecture:** The Cabinet web app installs to `~/.cabinet/app/v{version}/` (auto-downloaded on first use). Cabinets are lightweight data directories anywhere on disk — just a `.cabinet` manifest + `.agents/` + `.jobs/` + content files.

## Quick Start

```bash
# Create a new cabinet
npx cabinetai create my-startup

# Start it
cd my-startup
npx cabinetai run
```

Or use the `create-cabinet` shortcut (creates + starts in one step):

```bash
npx create-cabinet my-startup
```

## Commands

### `cabinetai create [name]`

Creates a new cabinet directory in the current folder.

```bash
# Create a root cabinet
cabinetai create my-startup

# Inside an existing cabinet, creates a child cabinet
cd my-startup
cabinetai create engineering
```

**What it creates:**

```
my-startup/
  .cabinet          # YAML manifest (name, id, kind, version)
  .agents/          # Agent personas directory
  .jobs/            # Scheduled job definitions
  index.md          # Entry page with frontmatter
```

### `cabinetai run`

Starts Cabinet serving the current cabinet directory.

```bash
cd my-startup
cabinetai run
```

**What it does:**

1. Finds the nearest `.cabinet` file (walks up from cwd)
2. Auto-downloads the app to `~/.cabinet/app/v{version}/` if not installed
3. Runs `npm install` if dependencies are missing
4. Finds available ports (defaults: app=4000, daemon=4100)
5. Starts Next.js dev server + daemon, both pointing at the cabinet dir via `CABINET_DATA_DIR`
6. Opens the browser

**Options:**

| Flag | Description |
|---|---|
| `--app-version <ver>` | Use a specific app version |
| `--no-open` | Don't open the browser |

**Environment variables:**

| Variable | Default | Description |
|---|---|---|
| `CABINET_APP_PORT` | 4000 | Preferred app port |
| `CABINET_DAEMON_PORT` | 4100 | Preferred daemon port |

### `cabinetai doctor`

Runs health checks on the environment.

```bash
cabinetai doctor
cabinetai doctor --fix    # Attempt auto-repair
cabinetai doctor --quiet  # Suppress output, auto-fix only
```

**Checks:**

- Node.js version (>= 18, recommends >= 20)
- Cabinet root found (`.cabinet` file exists)
- App installed at `~/.cabinet/app/v{version}/`
- App dependencies installed
- `.env.local` present in app directory
- Ports available

### `cabinetai update`

Downloads a newer app version.

```bash
cabinetai update
```

Fetches the latest release manifest from GitHub, compares with installed versions, and downloads if newer. Old versions stay cached.

### `cabinetai list`

Lists all cabinets in the current directory tree.

```bash
cabinetai list
```

```
  Name              Kind    Path              Agents  Jobs
  ────────────────  ─────  ────────────────  ──────  ────
  Text Your Mom     root   .                 4       4
  App Development   child  app-development   4       3
  Reddit Community  child  marketing/reddit  4       3
```

### `cabinetai import <template>`

Imports a cabinet template from the [hilash/cabinets](https://github.com/hilash/cabinets) registry.

```bash
cabinetai import saas-startup
cabinetai import text-your-mom
```

Downloads the template via sparse git clone and copies it to the current directory.

## File System Layout

### Global (`~/.cabinet/`)

```
~/.cabinet/
  app/
    v0.2.12/              # Version-pinned app install
      package.json
      node_modules/
      .next/
      server/
      src/
      .env.local
  state/
    runtime-ports.json    # Currently running server info
```

### Cabinet directory (anywhere on disk)

```
my-startup/
  .cabinet                # YAML manifest
  .cabinet-state/         # Runtime state (auto-created by app)
    runtime-ports.json
    install.json
    file-schema.json
  .agents/
    ceo/
      persona.md          # Agent definition (YAML frontmatter + markdown)
      tasks/
    cto/
      persona.md
  .jobs/
    weekly-brief.yaml     # Scheduled job definition
  index.md                # Entry page
  company/
    index.md
  engineering/
    .cabinet              # Child cabinet manifest
    .agents/
    .jobs/
    index.md
```

### `.cabinet` manifest format

```yaml
schemaVersion: 1
id: my-startup
name: My Startup
kind: root              # or "child"
version: 0.1.0
description: ""
entry: index.md

# Child cabinets only:
parent:
  shared_context:
    - /company/strategy/index.md
    - /company/goals/index.md

access:
  mode: subtree-plus-parent-brief
```

## Publishing

`cabinetai` is published to npm as part of the Cabinet release pipeline.

### Package location

```
cabinet/
  cabinetai/              # CLI source (TypeScript + esbuild)
    package.json          # name: "cabinetai"
    src/
    dist/index.js         # Single bundled file (gitignored)
  cli/                    # create-cabinet wrapper
    package.json          # name: "create-cabinet"
    index.cjs
```

### Build

```bash
cd cabinetai
npm install
npm run build     # Produces dist/index.js via esbuild
```

### How a release works (step by step)

One command bumps all versions, commits, tags, and pushes:

```bash
./scripts/release.sh patch   # or minor, major
```

**What `release.sh` does:**

1. Reads the current version from `package.json` (e.g., `0.2.12`)
2. Calculates the next version (e.g., `0.2.13`)
3. Bumps the `"version"` field in all three package.json files:
   - `package.json` — the Cabinet app
   - `cli/package.json` — `create-cabinet`
   - `cabinetai/package.json` — `cabinetai`
4. Runs `npm install --package-lock-only` to update the lockfile
5. Regenerates `cabinet-release.json` with the new tag
6. Commits: `Release v0.2.13`
7. Creates git tag: `v0.2.13`
8. Pushes commit and tag to `origin/main`

**What GitHub Actions does (triggered by the `vX.Y.Z` tag):**

| Job | What it publishes |
|---|---|
| `release-assets` | GitHub Release + `cabinet-release.json` artifact |
| `publish-cli` | `create-cabinet@0.2.13` to npm |
| `publish-cabinetai` | `cabinetai@0.2.13` to npm (builds with esbuild first) |
| `electron-macos` | Signed macOS DMG + ZIP attached to the GitHub Release |

**Verify after the tag ships:**

```bash
npm view create-cabinet version     # should show 0.2.13
npm view cabinetai version          # should show 0.2.13
gh release view v0.2.13 -R hilash/cabinet
npx cabinetai --version             # should show 0.2.13
```

### Version synchronization

Three packages must stay in lockstep:

| File | npm package | How version is used |
|---|---|---|
| `package.json` | `cabinet` (the app) | Source of truth. Release script reads from here. |
| `cli/package.json` | `create-cabinet` | Published to npm. Delegates to `cabinetai`. |
| `cabinetai/package.json` | `cabinetai` | Published to npm. Version injected at build time via esbuild `define` — no hardcoded strings in source. |

The release script (`scripts/release.sh`) handles all three in one shot. Never bump versions manually — always use the script.

### Release manifest

`cabinet-release.json` is generated per release and published as a GitHub Release asset. Clients poll it to check for updates:

```
https://github.com/hilash/cabinet/releases/latest/download/cabinet-release.json
```

Contents:

```json
{
  "manifestVersion": 1,
  "version": "0.2.13",
  "channel": "stable",
  "gitTag": "v0.2.13",
  "sourceTarballUrl": "https://github.com/hilash/cabinet/archive/refs/tags/v0.2.13.tar.gz",
  "npmPackage": "create-cabinet",
  "createCabinetVersion": "0.2.13",
  "cabinetaiPackage": "cabinetai",
  "cabinetaiVersion": "0.2.13",
  "electron": { "macos": { "zipAssetName": "Cabinet-darwin-arm64.zip", "dmgAssetName": "Cabinet.dmg" } }
}
```

The `cabinetai update` command fetches this manifest to determine if a newer app version is available.

### Required GitHub secrets

| Secret | Used by |
|---|---|
| `NPM_TOKEN` | `publish-cli` and `publish-cabinetai` jobs |
| `APPLE_ID` | Electron notarization |
| `APPLE_APP_PASSWORD` | Electron notarization |
| `APPLE_TEAM_ID` | Electron notarization |
| `APPLE_SIGN_IDENTITY` | Electron code signing |
| `APPLE_CERTIFICATE` | Electron code signing |
| `APPLE_CERTIFICATE_PASSWORD` | Electron code signing |

`GITHUB_TOKEN` is provided automatically by GitHub Actions.

## Relationship: `create-cabinet` vs `cabinetai`

| | `create-cabinet` | `cabinetai` |
|---|---|---|
| npm name | `create-cabinet` | `cabinetai` |
| Purpose | First-time setup shortcut | Full runtime CLI |
| Usage | `npx create-cabinet my-project` | `npx cabinetai <command>` |
| Implementation | Thin wrapper — delegates to cabinetai | All logic lives here |
| When to use | Creating a brand new cabinet + starting it | Day-to-day operations |

`npx create-cabinet my-project` is equivalent to `cabinetai create my-project && cd my-project && cabinetai run`.

## Known Limitations

- **`.cabinet` vs `.cabinet-state` conflict:** The released v0.2.12 app uses `.cabinet` as a directory name for internal state. The current codebase has already renamed this to `.cabinet-state`. The first release including `cabinetai` will have both fixes aligned.
- **Import relies on git sparse checkout:** The `import` command requires `git` to be installed. If the registry repo changes structure, the sparse checkout paths may need updating.
