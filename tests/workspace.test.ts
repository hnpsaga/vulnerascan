import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import { RunManager } from "../src/workspace/run-manager.js";
import { ProjectType } from "../src/models/project-type.js";
import { ProjectInfo } from "../src/models/project-info.js";
import type { Run } from "../src/workspace/models/run.js";

const TEST_WORKSPACES_DIR = join(import.meta.dirname, "tmp-workspaces");

describe("WorkspaceManager", () => {
  let workspaceManager: WorkspaceManager;

  beforeEach(() => {
    if (existsSync(TEST_WORKSPACES_DIR)) {
      rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
    }
    workspaceManager = new WorkspaceManager(TEST_WORKSPACES_DIR);
  });

  afterEach(() => {
    if (existsSync(TEST_WORKSPACES_DIR)) {
      rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
    }
  });

  it("creates workspace", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const workspace = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);

    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe("dummy-project");
    expect(workspace.sourcePath).toBe(projectPath);
    expect(workspace.projectType).toBe(ProjectType.Node);
    expect(workspace.createdAt).toBeDefined();
    expect(workspace.lastRunAt).toBeDefined();

    const workspaceDir = join(TEST_WORKSPACES_DIR, workspace.id);
    expect(existsSync(workspaceDir)).toBe(true);
    expect(existsSync(join(workspaceDir, "workspace.json"))).toBe(true);
    expect(existsSync(join(workspaceDir, "manifests"))).toBe(true);
    expect(existsSync(join(workspaceDir, "generated"))).toBe(true);
    expect(existsSync(join(workspaceDir, "cache"))).toBe(true);
    expect(existsSync(join(workspaceDir, "runs"))).toBe(true);
  });

  it("loads existing workspace", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const first = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);
    const second = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it("reuses workspace on subsequent scans", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const first = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);
    const second = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);

    expect(second.id).toBe(first.id);
  });

  it("generates stable workspace id", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const firstId = (await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node))
      .id;
    const secondId = (await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node))
      .id;

    expect(firstId).toBe(secondId);
    expect(firstId).toHaveLength(8);
  });
});

describe("RunManager", () => {
  let workspaceManager: WorkspaceManager;
  let runManager: RunManager;

  beforeEach(() => {
    if (existsSync(TEST_WORKSPACES_DIR)) {
      rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
    }
    workspaceManager = new WorkspaceManager(TEST_WORKSPACES_DIR);
    runManager = new RunManager(TEST_WORKSPACES_DIR);
  });

  afterEach(() => {
    if (existsSync(TEST_WORKSPACES_DIR)) {
      rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
    }
  });

  it("creates run directory", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const workspace = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);
    const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };

    const run = await runManager.createRun(workspace.id, projectInfo);
    const runDir = join(TEST_WORKSPACES_DIR, workspace.id, "runs", run.id);

    expect(existsSync(runDir)).toBe(true);
    expect(existsSync(join(runDir, "run.json"))).toBe(true);
    expect(existsSync(join(runDir, "discovery.json"))).toBe(true);
  });

  it("persists metadata", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const workspace = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);
    const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };

    const run = await runManager.createRun(workspace.id, projectInfo);
    const runDir = join(TEST_WORKSPACES_DIR, workspace.id, "runs", run.id);

    const runJsonContent = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8")) as Run;
    expect(runJsonContent.id).toBe(run.id);
    expect(runJsonContent.status).toBe("completed");
    expect(runJsonContent.timestamp).toBe(run.timestamp);

    const discoveryJsonContent = JSON.parse(
      readFileSync(join(runDir, "discovery.json"), "utf8"),
    ) as { projectType: string; manifest: string };
    expect(discoveryJsonContent.projectType).toBe("node");
    expect(discoveryJsonContent.manifest).toBe("package.json");
  });

  it("supports named runs", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const workspace = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);
    const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };

    const run = await runManager.createRun(workspace.id, projectInfo, {
      name: "Before React Upgrade",
    });
    const runDir = join(TEST_WORKSPACES_DIR, workspace.id, "runs", run.id);

    const runJsonContent = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8")) as Run;
    expect(runJsonContent.name).toBe("Before React Upgrade");
  });

  it("creates multiple runs under same workspace", async () => {
    const projectPath = join(TEST_WORKSPACES_DIR, "dummy-project");
    const workspace = await workspaceManager.findOrCreateWorkspace(projectPath, ProjectType.Node);
    const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };

    const run1 = await runManager.createRun(workspace.id, projectInfo);
    // Sleep 1 second to ensure different timestamp folder name
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const run2 = await runManager.createRun(workspace.id, projectInfo);

    const runsDir = join(TEST_WORKSPACES_DIR, workspace.id, "runs");
    const runs = readdirSync(runsDir);
    expect(runs).toContain(run1.id);
    expect(runs).toContain(run2.id);
    expect(runs.length).toBe(2);
  });
});

describe("Integration", () => {
  const FIXTURES = join(import.meta.dirname, "fixtures");
  const CLI_ENTRY = join(import.meta.dirname, "..", "src", "cli.ts");
  const dummyHome = join(TEST_WORKSPACES_DIR, "dummy-home");

  beforeEach(() => {
    if (existsSync(TEST_WORKSPACES_DIR)) {
      rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_WORKSPACES_DIR)) {
      rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
    }
  });

  it("runs scan twice and creates 1 workspace and 2 runs", async () => {
    const projectCwd = join(FIXTURES, "node-project");

    const execOpts = {
      cwd: projectCwd,
      env: {
        ...process.env,
        VULNERASCAN_HOME: dummyHome,
        NO_COLOR: "1",
      },
    };

    // First scan
    const run1 = execSync(`node --import tsx/esm ${CLI_ENTRY} scan`, execOpts).toString();
    expect(run1).toContain("Project Type: Node.js");
    expect(run1).toContain("Workspace: node-project");
    expect(run1).toContain("Run:");

    // Wait 1 second to ensure distinct timestamp run IDs
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second scan
    const run2 = execSync(
      `node --import tsx/esm ${CLI_ENTRY} scan --name "Second Run"`,
      execOpts,
    ).toString();
    expect(run2).toContain("Project Type: Node.js");
    expect(run2).toContain("Workspace: node-project");
    expect(run2).toContain("Run: Second Run");

    // Verify disk storage
    const workspacesBase = join(dummyHome, ".vulnerascan", "workspaces");
    expect(existsSync(workspacesBase)).toBe(true);

    const workspaces = readdirSync(workspacesBase);
    expect(workspaces.length).toBe(1);

    const workspaceId = workspaces[0];
    const runsDir = join(workspacesBase, workspaceId, "runs");
    const runs = readdirSync(runsDir);
    expect(runs.length).toBe(2);
  });
});
