import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import { homedir } from "os";
import { ProjectRegistryService } from "../src/workspace/project-registry-service.js";
import { WorkspaceMetadataService } from "../src/workspace/workspace-metadata-service.js";
import { RunManager } from "../src/workspace/run-manager.js";

describe("CLI Dashboard Commands", () => {
  const tempBaseDir = path.join(homedir(), ".vulnerascan-test-cli-dashboard");

  beforeEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempBaseDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it("should run dashboard summary and dashboard projects CLI commands", async () => {
    const homeDir = path.join(tempBaseDir, ".vulnerascan");
    const registryService = new ProjectRegistryService(homeDir);
    const workspacesDir = path.join(homeDir, "workspaces");
    const metadataService = new WorkspaceMetadataService(workspacesDir);
    const runManager = new RunManager(workspacesDir);

    const projectPath = path.join(tempBaseDir, "my-cli-project");
    fs.mkdirSync(projectPath, { recursive: true });

    const { WorkspaceManager } = await import("../src/workspace/workspace-manager.js");
    const wsManager = new WorkspaceManager(workspacesDir);
    const workspace = await wsManager.findOrCreateWorkspace(projectPath, "node");

    const workspaceId = workspace.id;

    // Mock project using the computed workspaceId
    const entry = await registryService.registerProject({
      path: projectPath,
      name: "my-cli-project",
      ecosystem: "node",
      status: "healthy",
      workspaceId: workspaceId,
    });

    const { ProjectType } = await import("../src/models/project-type.js");
    const run = await runManager.createRun(workspaceId, {
      type: ProjectType.Node,
      manifest: "package.json",
    });

    await metadataService.recordRun(
      workspaceId,
      {
        runId: run.id,
        timestamp: run.timestamp,
        status: "completed",
        ecosystem: "node",
      },
      {
        status: "healthy",
        directDependencies: 1,
        totalDependencies: 3,
        vulnerabilitiesCount: 0,
      },
    );

    const PROJECT_ROOT = path.resolve("./");
    const CLI_ENTRY = path.join(PROJECT_ROOT, "src", "cli.ts");

    // Call CLI using process env to target temp base dir
    const env = { ...process.env, VULNERASCAN_HOME: tempBaseDir };

    const summaryOutput = execFileSync(
      "node",
      ["--import", "tsx/esm", CLI_ENTRY, "dashboard", "summary"],
      {
        env,
        encoding: "utf8",
      },
    );
    expect(summaryOutput).toContain("VULNERASCAN DASHBOARD SUMMARY");
    expect(summaryOutput).toContain("Total Projects:       1");
    expect(summaryOutput).toContain("Total Scans:          1");

    const projectsOutput = execFileSync(
      "node",
      ["--import", "tsx/esm", CLI_ENTRY, "dashboard", "projects"],
      {
        env,
        encoding: "utf8",
      },
    );
    expect(projectsOutput).toContain("VULNERASCAN PROJECTS");
    expect(projectsOutput).toContain("Name:         my-cli-project");

    // Avoid unused warning
    expect(entry.id).toBeDefined();
  });
});
