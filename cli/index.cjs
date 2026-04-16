#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * create-cabinet — thin wrapper that delegates to cabinetai.
 *
 * Usage:
 *   npx create-cabinet [dir]           → cabinetai create <dir> + cabinetai run
 *   npx create-cabinet help            → cabinetai --help
 *   npx create-cabinet upgrade [opts]  → cabinetai update (legacy compat)
 */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const COMMANDS = ["init", "upgrade", "help", "--help"];
const firstArg = args[0] || "init";
const command = COMMANDS.includes(firstArg) ? firstArg : "init";
const dirArg = COMMANDS.includes(firstArg) ? args[1] : firstArg;

function resolveCabinetAI() {
  // Prefer local cabinetai from node_modules if available
  const localBin = path.join(__dirname, "..", "node_modules", ".bin", "cabinetai");
  if (fs.existsSync(localBin)) return localBin;
  return null;
}

function runCabinetAI(cmdArgs) {
  const localBin = resolveCabinetAI();

  if (localBin) {
    const result = spawnSync(process.execPath, [localBin, ...cmdArgs], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    return result.status || 0;
  }

  // Fall back to npx — use spawnSync with args array to prevent shell injection
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npxBin, ["cabinetai@latest", ...cmdArgs], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  return result.status || 0;
}

if (command === "help" || command === "--help") {
  console.log(`
  create-cabinet — Create a new Cabinet project

  This tool delegates to the cabinetai CLI.

  Usage:
    npx create-cabinet [directory]    Create a new cabinet and start it
    npx create-cabinet help           Show this help

  For more commands, use cabinetai directly:
    npx cabinetai --help
  `);
  process.exit(0);
}

if (command === "upgrade") {
  // Legacy upgrade compat — delegate to cabinetai update
  const status = runCabinetAI(["update"]);
  process.exit(status);
}

// Default: init — create cabinet + run
const targetDir = dirArg || "cabinet";

console.log(`
  ┌─────────────────────────────┐
  │                             │
  │   📦  Cabinet               │
  │   AI-first startup OS       │
  │                             │
  └─────────────────────────────┘
`);

// Step 1: Create the cabinet
const createStatus = runCabinetAI(["create", targetDir]);
if (createStatus !== 0) {
  process.exit(createStatus);
}

// Step 2: Run Cabinet from the new directory
const targetPath = path.resolve(process.cwd(), targetDir);
process.chdir(targetPath);
const runStatus = runCabinetAI(["run"]);
process.exit(runStatus);
