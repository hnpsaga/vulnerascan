import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { DependencyResolutionService } from "../src/resolution/dependency-resolution-service.js";
import { NpmManifestManager } from "../src/resolution/npm/npm-manifest-manager.js";
import { NpmLockfileGenerator } from "../src/resolution/npm/npm-lockfile-generator.js";
import { NpmResolutionParser } from "../src/resolution/npm/npm-resolution-parser.js";
import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import { RunManager } from "../src/workspace/run-manager.js";
import { ProjectType } from "../src/models/project-type.js";
import { ProjectInfo } from "../src/models/project-info.js";
import type {
  DependencyResolutionSuccess,
  DependencyResolutionFailure,
} from "../src/resolution/models/dependency-resolution.js";

const TEST_DIR = join(import.meta.dirname, "tmp-resolution-tests");
const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const CLI_ENTRY = join(import.meta.dirname, "..", "src", "cli.ts");

function runCLI(
  args: string,
  cwd: string,
  envHome: string,
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node --import tsx/esm ${CLI_ENTRY} ${args}`, {
      encoding: "utf-8",
      cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        VULNERASCAN_HOME: envHome,
        NO_COLOR: "1",
      },
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

describe("Dependency Resolution Engine", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("NpmManifestManager", () => {
    it("copies package.json and package-lock.json if they exist", async () => {
      const manager = new NpmManifestManager();
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-1");

      await manager.copyManifests(srcDir, workspacePath);

      expect(existsSync(join(workspacePath, "manifests", "package.json"))).toBe(true);
      expect(existsSync(join(workspacePath, "manifests", "package-lock.json"))).toBe(true);
      expect(await manager.hasLockfile(workspacePath)).toBe(true);
    });

    it("copies only package.json if lockfile is missing", async () => {
      const manager = new NpmManifestManager();
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-2");

      await manager.copyManifests(srcDir, workspacePath);

      expect(existsSync(join(workspacePath, "manifests", "package.json"))).toBe(true);
      expect(existsSync(join(workspacePath, "manifests", "package-lock.json"))).toBe(false);
      expect(await manager.hasLockfile(workspacePath)).toBe(false);
    });
  });

  describe("NpmLockfileGenerator", () => {
    it("generates package-lock.json in the generated directory", async () => {
      const manifestManager = new NpmManifestManager();
      const generator = new NpmLockfileGenerator();
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-3");

      await manifestManager.copyManifests(srcDir, workspacePath);
      await generator.generateLockfile(workspacePath);

      expect(existsSync(join(workspacePath, "generated", "package.json"))).toBe(true);
      expect(existsSync(join(workspacePath, "generated", "package-lock.json"))).toBe(true);
    });
  });

  describe("NpmResolutionParser", () => {
    it("parses direct and total dependency counts from existing lockfile", async () => {
      const manifestManager = new NpmManifestManager();
      const parser = new NpmResolutionParser();
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-4");

      await manifestManager.copyManifests(srcDir, workspacePath);
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      // direct: foo, bar = 2
      // total: foo, bar, baz = 3
      expect(summary.directDependencies).toBe(2);
      expect(summary.totalDependencies).toBe(3);
    });
  });

  describe("DependencyResolutionService", () => {
    let workspaceManager: WorkspaceManager;
    let runManager: RunManager;
    let service: DependencyResolutionService;

    beforeEach(() => {
      workspaceManager = new WorkspaceManager(TEST_DIR);
      runManager = new RunManager(TEST_DIR);
      service = new DependencyResolutionService(TEST_DIR);
    });

    it("resolves and persists metadata for existing lockfile project", async () => {
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspace = await workspaceManager.findOrCreateWorkspace(srcDir, ProjectType.Node);
      const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };
      const run = await runManager.createRun(workspace.id, projectInfo);

      const resolution = (await service.resolve(workspace, run)) as DependencyResolutionSuccess;

      expect(resolution.status).toBeUndefined();
      expect(resolution.schemaVersion).toBe(1);
      expect(resolution.projectType).toBe("node");
      expect(resolution.packageManager).toBe("npm");
      expect(resolution.resolutionSource).toBe("existing-lockfile");
      expect(resolution.directDependencies).toBe(2);
      expect(resolution.totalDependencies).toBe(3);

      const resolutionJsonPath = join(
        TEST_DIR,
        workspace.id,
        "runs",
        run.id,
        "dependency-resolution.json",
      );
      expect(existsSync(resolutionJsonPath)).toBe(true);

      const content = JSON.parse(readFileSync(resolutionJsonPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(content.resolutionSource).toBe("existing-lockfile");
      expect(content.directDependencies).toBe(2);
      expect(content.totalDependencies).toBe(3);
    });

    it("resolves and persists metadata for project without lockfile", async () => {
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const workspace = await workspaceManager.findOrCreateWorkspace(srcDir, ProjectType.Node);
      const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };
      const run = await runManager.createRun(workspace.id, projectInfo);

      const resolution = (await service.resolve(workspace, run)) as DependencyResolutionSuccess;

      expect(resolution.status).toBeUndefined();
      expect(resolution.resolutionSource).toBe("generated-lockfile");
      expect(resolution.directDependencies).toBe(1);
      expect(resolution.totalDependencies).toBeGreaterThan(0);

      const resolutionJsonPath = join(
        TEST_DIR,
        workspace.id,
        "runs",
        run.id,
        "dependency-resolution.json",
      );
      expect(existsSync(resolutionJsonPath)).toBe(true);
    });

    it("handles failed resolution for invalid package.json", async () => {
      const srcDir = join(FIXTURES_DIR, "invalid-package-json");
      const workspace = await workspaceManager.findOrCreateWorkspace(srcDir, ProjectType.Node);
      const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };
      const run = await runManager.createRun(workspace.id, projectInfo);

      const resolution = (await service.resolve(workspace, run)) as DependencyResolutionFailure;

      expect(resolution.status).toBe("failed");
      expect(resolution.reason).toBeDefined();

      const resolutionJsonPath = join(
        TEST_DIR,
        workspace.id,
        "runs",
        run.id,
        "dependency-resolution.json",
      );
      expect(existsSync(resolutionJsonPath)).toBe(true);

      const content = JSON.parse(readFileSync(resolutionJsonPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(content.status).toBe("failed");
    });
  });

  describe("CLI Command Integration", () => {
    it("successfully runs scan with existing lockfile", () => {
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const result = runCLI("scan", srcDir, TEST_DIR);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Project Type: Node.js");
      expect(result.stdout).toContain("Resolution Source: existing-lockfile");
      expect(result.stdout).toContain("Direct Dependencies: 2");
      expect(result.stdout).toContain("Total Dependencies: 3");
    });

    it("successfully runs scan without lockfile and generates one", () => {
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const result = runCLI("scan", srcDir, TEST_DIR);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Project Type: Node.js");
      expect(result.stdout).toContain("Resolution Source: generated-lockfile");
      expect(result.stdout).toContain("Direct Dependencies: 1");
      expect(result.stdout).toContain("Total Dependencies:");
    });

    it("exits with code 1 for failed resolution", () => {
      const srcDir = join(FIXTURES_DIR, "invalid-package-json");
      const result = runCLI("scan", srcDir, TEST_DIR);

      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain("Dependency resolution failed.");
    });
  });
});
