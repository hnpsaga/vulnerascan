import { Command } from "commander";
import { homedir, platform } from "os";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import process from "process";

const home = process.env.VULNERASCAN_HOME || homedir();
const CONFIG_DIR = join(home, ".vulnerascan");

interface CheckResult {
  label: string;
  passed: boolean;
  detail?: string;
}

function checkNodeVersion(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);
  const passed = major >= 18;
  return {
    label: "Node version",
    passed,
    detail: `${version} (minimum: v18)`,
  };
}

function checkPlatform(): CheckResult {
  const plat = platform();
  const supported = ["linux", "darwin", "win32"];
  const passed = supported.includes(plat);
  return {
    label: "Platform",
    passed,
    detail: plat,
  };
}

function checkCLI(): CheckResult {
  return {
    label: "CLI installed",
    passed: true,
    detail: "vulnerascan is reachable",
  };
}

function checkConfigDir(): CheckResult {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const accessible = existsSync(CONFIG_DIR);
  return {
    label: "Configuration directory accessible",
    passed: accessible,
    detail: CONFIG_DIR,
  };
}

function printCheck(result: CheckResult): void {
  const icon = result.passed ? "\u2714" : "\u2716";
  const detail = result.detail ? ` (${result.detail})` : "";
  console.log(`${icon} ${result.label}${detail}`);
}

export const doctorCommand = new Command("doctor")
  .description("Run environment checks and validate the CLI setup")
  .action(() => {
    console.log("Running VulneraScan doctor checks...\n");

    const checks: CheckResult[] = [
      checkNodeVersion(),
      checkPlatform(),
      checkCLI(),
      checkConfigDir(),
    ];

    for (const check of checks) {
      printCheck(check);
    }

    const allPassed = checks.every((c) => c.passed);
    console.log("");

    if (allPassed) {
      console.log("All checks passed. VulneraScan is ready.");
    } else {
      console.log("Some checks failed. Please review the output above.");
      process.exit(1);
    }
  });
