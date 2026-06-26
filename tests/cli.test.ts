import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const CLI_ENTRY = join(PROJECT_ROOT, "src", "cli.ts");

function runCLI(
  args: string,
  options?: { cwd?: string },
): { stdout: string; stderr: string; exitCode: number } {
  const cwd = options?.cwd ?? PROJECT_ROOT;
  if (!existsSync(cwd)) {
    mkdirSync(cwd, { recursive: true });
  }
  try {
    const stdout = execSync(`node --import tsx/esm ${CLI_ENTRY} ${args}`, {
      encoding: "utf-8",
      cwd,
      env: { ...process.env, VULNERASCAN_TEST_MODE: "true", NO_COLOR: "1" },
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

const FIXTURES = join(import.meta.dirname, "fixtures");

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
    expect(result.stdout.trim()).toBe("VulneraScan v0.0.3");
  });
});

describe("scan command", () => {
  it("detects Node.js project from repository root", () => {
    const result = runCLI("scan");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Node.js");
    expect(result.stdout).toContain("Manifest: package.json");
  });

  it("detects Node.js project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "node-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Node.js");
    expect(result.stdout).toContain("Manifest: package.json");
  });

  it("detects Maven project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "maven-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Maven");
    expect(result.stdout).toContain("Manifest: pom.xml");
    expect(result.stdout).toContain("Resolution Source: generated-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 2");
  });

  it("detects Gradle project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "gradle-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Gradle");
    expect(result.stdout).toContain("Manifest: build.gradle");
    expect(result.stdout).toContain("Resolution Source: generated-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 2");
  });

  it("detects Gradle Kotlin project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "gradle-kts-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Gradle");
    expect(result.stdout).toContain("Manifest: build.gradle.kts");
    expect(result.stdout).toContain("Resolution Source: generated-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 2");
  });

  it("detects Python project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "python-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Python");
    expect(result.stdout).toContain("Manifest: requirements.txt");
    expect(result.stdout).toContain("Resolution Source: generated-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 1");
  });

  it("detects Python pyproject in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "python-pyproject") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Python");
    expect(result.stdout).toContain("Manifest: pyproject.toml");
    expect(result.stdout).toContain("Resolution Source: generated-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 0");
  });

  it("detects Go project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "go-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Go");
    expect(result.stdout).toContain("Manifest: go.mod");
    expect(result.stdout).toContain("Resolution Source: existing-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 1");
    expect(result.stdout).toContain("Total Dependencies: 2");
  });

  it("detects Rust project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "rust-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: Rust");
    expect(result.stdout).toContain("Manifest: Cargo.toml");
    expect(result.stdout).toContain("Resolution Source: existing-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 1");
    expect(result.stdout).toContain("Total Dependencies: 2");
  });

  it("detects .NET project in fixture directory", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "dotnet-project") });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Project Type: .NET");
    expect(result.stdout).toContain("Manifest: test.csproj");
    expect(result.stdout).toContain("Resolution Source: existing-lockfile");
    expect(result.stdout).toContain("Direct Dependencies: 1");
    expect(result.stdout).toContain("Total Dependencies: 2");
  });

  it("exits with code 1 for unknown project", () => {
    const result = runCLI("scan", { cwd: join(FIXTURES, "unknown-project") });
    expect(result.exitCode).toBe(1);
    expect(result.stdout || result.stderr).toContain("No supported project type detected.");
  });

  describe("--path option", () => {
    it("scans project using absolute path via --path", () => {
      const target = join(FIXTURES, "node-project");
      const result = runCLI(`scan --path ${target}`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Project Type: Node.js");
      expect(result.stdout).toContain("Manifest: package.json");
    });

    it("scans project using relative path via -p", () => {
      const result = runCLI(`scan -p ./tests/fixtures/node-project`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Project Type: Node.js");
    });

    it("exits with code 1 for invalid path", () => {
      const result = runCLI(`scan --path ./non-existent-directory-xyz`);
      expect(result.exitCode).toBe(1);
      expect(result.stdout || result.stderr).toContain("Error: Scanned path does not exist");
    });
  });

  describe("--output option", () => {
    it("writes reports to custom output directory", () => {
      const outDir = join(PROJECT_ROOT, "tests", "temp-reports");
      const target = join(FIXTURES, "node-project");

      const result = runCLI(`scan --path ${target} --output ${outDir}`);
      expect(result.exitCode).toBe(0);

      expect(existsSync(join(outDir, "vulnerabilities.json"))).toBe(true);
      expect(existsSync(join(outDir, "vulnerabilities.md"))).toBe(true);
      expect(existsSync(join(outDir, "vulnerabilities.csv"))).toBe(true);

      // Cleanup
      rmSync(outDir, { recursive: true, force: true });
    });
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
