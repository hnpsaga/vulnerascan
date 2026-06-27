import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DashboardServer } from "../src/workspace/dashboard-server.js";
import { ProjectRegistryService } from "../src/workspace/project-registry-service.js";
import { WorkspaceMetadataService } from "../src/workspace/workspace-metadata-service.js";
import { RunManager } from "../src/workspace/run-manager.js";
import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import {
  ProjectSummary,
  HistoricalScanSummary,
  DashboardSummary,
} from "../src/models/dashboard.js";
import path from "path";
import fs from "fs";
import { homedir } from "os";

describe("Dashboard HTTP Server", () => {
  const tempBaseDir = path.join(homedir(), ".vulnerascan-test-server");
  let server: DashboardServer;

  beforeEach(async () => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
    process.env.VULNERASCAN_HOME = tempBaseDir;
    const workspacesDir = path.join(tempBaseDir, ".vulnerascan", "workspaces");
    const registryService = new ProjectRegistryService(tempBaseDir);

    const metadataService = new WorkspaceMetadataService(tempBaseDir);
    const runManager = new RunManager(tempBaseDir);

    const projectPath = path.join(tempBaseDir, "my-server-project");
    fs.mkdirSync(projectPath, { recursive: true });

    const wsManager = new WorkspaceManager(tempBaseDir);
    const workspace = await wsManager.findOrCreateWorkspace(projectPath, "node");

    const workspaceId = workspace.id;

    // Register project
    await registryService.registerProject({
      path: projectPath,
      name: "my-server-project",
      ecosystem: "node",
      status: "healthy",
      workspaceId: workspaceId,
    });

    const { ProjectType } = await import("../src/models/project-type.js");
    const run = await runManager.createRun(workspaceId, {
      type: ProjectType.Node,
      manifest: "package.json",
    });

    const runDir = path.join(workspacesDir, workspaceId, "runs", run.id);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // Write mock vulnerabilities.json report file
    await fs.promises.writeFile(
      path.join(runDir, "vulnerabilities.json"),
      JSON.stringify({
        schemaVersion: 1,
        timestamp: run.timestamp,
        totalPackagesScanned: 5,
        vulnerablePackages: 0,
        findings: [],
      }),
      "utf8",
    );

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

    server = new DashboardServer({ port: 4001, host: "127.0.0.1" }, tempBaseDir);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it("should serve summary endpoint", async () => {
    const res = await fetch("http://127.0.0.1:4001/api/summary");
    expect(res.status).toBe(200);
    const data = (await res.json()) as DashboardSummary;
    expect(data.statistics.totalProjects).toBe(1);
    expect(data.statistics.totalScans).toBe(1);
  });

  it("should serve projects endpoint", async () => {
    const res = await fetch("http://127.0.0.1:4001/api/projects");
    expect(res.status).toBe(200);
    const data = (await res.json()) as ProjectSummary[];
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("my-server-project");
  });

  it("should serve timeline endpoint", async () => {
    const res = await fetch("http://127.0.0.1:4001/api/timeline");
    expect(res.status).toBe(200);
    const data = (await res.json()) as HistoricalScanSummary[];
    expect(data.length).toBe(1);
    expect(data[0].projectName).toBe("my-server-project");
  });

  it("should serve json report endpoint", async () => {
    const projectsRes = await fetch("http://127.0.0.1:4001/api/projects");
    const projects = (await projectsRes.json()) as ProjectSummary[];
    const p = projects[0];

    const runId = p.latestScan?.runId || "";
    const reportUrl = `http://127.0.0.1:4001/api/projects/${p.workspaceId}/runs/${runId}/report/json`;
    const res = await fetch(reportUrl);

    expect(res.status).toBe(200);
    const data = (await res.json()) as { totalPackagesScanned: number };
    expect(data.totalPackagesScanned).toBe(5);
  });
});
