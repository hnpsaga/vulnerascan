import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Helper to run the CLI via tsx during testing (no build required).
 */
function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node --import tsx/esm src/cli.ts ${args}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const error = err as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      exitCode: error.status ?? 1,
    };
  }
}

describe("CLI startup", () => {
  it("shows help when invoked with --help", () => {
    const result = runCLI("--help");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("vulnerascan");
    expect(result.stdout).toContain("scan");
    expect(result.stdout).toContain("doctor");
    expect(result.stdout).toContain("version");
  });

  it("displays description in help output", () => {
    const result = runCLI("--help");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("vulnerability scanner");
  });
});

describe("version command", () => {
  it("outputs the correct version string", () => {
    const result = runCLI("version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("VulneraScan v0.0.1");
  });
});

describe("scan command", () => {
  it("outputs coming-soon message", () => {
    const result = runCLI("scan");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Scanning functionality coming in v0.0.2");
  });
});

describe("doctor command", () => {
  it("exits with code 0 on a healthy environment", () => {
    const result = runCLI("doctor");
    expect(result.exitCode).toBe(0);
  });

  it("outputs check labels", () => {
    const result = runCLI("doctor");
    expect(result.stdout).toContain("Node version");
    expect(result.stdout).toContain("Platform");
    expect(result.stdout).toContain("CLI installed");
    expect(result.stdout).toContain("Configuration directory");
  });

  it("creates ~/.vulnerascan directory if missing", () => {
    runCLI("doctor");
    const configDir = join(homedir(), ".vulnerascan");
    expect(existsSync(configDir)).toBe(true);
  });
});
