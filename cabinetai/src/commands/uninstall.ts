import type { Command } from "commander";
import fs from "fs";
import path from "path";
import { log, success, warning, error } from "../lib/log.js";
import { CABINET_HOME } from "../lib/paths.js";
import { listInstalledVersions } from "../lib/app-manager.js";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description("Remove cached app versions from ~/.cabinet")
    .option("--all", "Remove the entire ~/.cabinet directory")
    .action((opts: { all?: boolean }) => {
      uninstall(opts);
    });
}

function uninstall(opts: { all?: boolean }): void {
  if (!fs.existsSync(CABINET_HOME)) {
    success("Nothing to remove — ~/.cabinet does not exist.");
    return;
  }

  if (opts.all) {
    const appDir = path.join(CABINET_HOME, "app");
    const stateDir = path.join(CABINET_HOME, "state");

    // Remove app versions
    if (fs.existsSync(appDir)) {
      const versions = listInstalledVersions();
      fs.rmSync(appDir, { recursive: true, force: true });
      log(`Removed ${versions.length} cached app version${versions.length !== 1 ? "s" : ""}.`);
    }

    // Remove global state
    if (fs.existsSync(stateDir)) {
      fs.rmSync(stateDir, { recursive: true, force: true });
      log("Removed global state.");
    }

    // Remove config
    const configPath = path.join(CABINET_HOME, "config.json");
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      log("Removed global config.");
    }

    // Remove ~/.cabinet if empty
    try {
      fs.rmdirSync(CABINET_HOME);
    } catch {
      // Not empty — other files may exist, leave it
    }

    success("Cabinet uninstalled. Your cabinet directories and data are untouched.");
    return;
  }

  // Default: just remove cached app versions
  const versions = listInstalledVersions();
  if (versions.length === 0) {
    success("No cached app versions found.");
    return;
  }

  const appDir = path.join(CABINET_HOME, "app");
  fs.rmSync(appDir, { recursive: true, force: true });
  fs.mkdirSync(appDir, { recursive: true });

  success(`Removed ${versions.length} cached app version${versions.length !== 1 ? "s" : ""}: ${versions.join(", ")}`);
  log("Next 'npx cabinetai run' will re-download the app.");
}
