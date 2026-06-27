import { Command } from "commander";
import { homedir, platform } from "os";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import process from "process";
import { execSync } from "child_process";

const home = process.env.VULNERASCAN_HOME || homedir();
const CONFIG_DIR = join(home, ".vulnerascan");

interface CheckResult {
  label: string;
  passed: boolean;
  detail?: string;
  optional?: boolean;
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

function checkEcosystemTool(
  label: string,
  cmd: string,
  versionArgs: string[] = ["--version"],
): CheckResult {
  try {
    const output = execSync(`${cmd} ${versionArgs.join(" ")}`, {
      stdio: "pipe",
      env: { ...process.env },
    })
      .toString()
      .trim()
      .split("\n")[0];
    return {
      label,
      passed: true,
      detail: output,
      optional: true,
    };
  } catch {
    return {
      label,
      passed: false,
      detail: "Not found in PATH",
      optional: true,
    };
  }
}

function printCheck(result: CheckResult): void {
  const icon = result.passed ? "\u2714" : result.optional ? "\u26A0" : "\u2716";
  const prefix = result.optional ? "[Ecosystem] " : "";
  const detail = result.detail ? ` (${result.detail})` : "";
  console.log(`${icon} ${prefix}${result.label}${detail}`);
}

export const doctorCommand = new Command("doctor")
  .description("Run environment checks and validate the CLI setup")
  .action(() => {
    console.log("Running VulneraScan doctor checks...\n");

    const coreChecks: CheckResult[] = [checkNodeVersion(), checkPlatform(), checkConfigDir()];

    const ecosystemTools = [
      { label: "npm package manager", cmd: "npm" },
      { label: "pnpm package manager", cmd: "pnpm" },
      { label: "yarn package manager", cmd: "yarn" },
      { label: "Maven (Java)", cmd: "mvn" },
      { label: "Gradle (Java)", cmd: "gradle" },
      { label: "pip (Python)", cmd: "pip", args: ["--version"] },
      { label: "Python 3", cmd: "python3", args: ["--version"] },
      { label: "Go (Golang)", cmd: "go", args: ["version"] },
      { label: "Cargo (Rust)", cmd: "cargo" },
      { label: "Composer (PHP)", cmd: "composer" },
      { label: "dotnet CLI (.NET)", cmd: "dotnet", args: ["--version"] },
    ];

    const ecosystemChecks: CheckResult[] = ecosystemTools.map((t) =>
      checkEcosystemTool(t.label, t.cmd, t.args),
    );

    console.log("--- Core Environment Checks ---");
    for (const check of coreChecks) {
      printCheck(check);
    }

    console.log("\n--- Ecosystem Tooling Diagnostics (Optional) ---");
    for (const check of ecosystemChecks) {
      printCheck(check);
    }

    const corePassed = coreChecks.every((c) => c.passed);
    console.log("");

    if (corePassed) {
      console.log("All core checks passed. VulneraScan runtime environment is healthy.");
      console.log(
        "Note: Missing ecosystem tools only affect project scanning for those specific platforms.",
      );
    } else {
      console.log("Core environment checks failed. Please resolve the errors above.");
      process.exit(1);
    }
  });
