import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import { homedir } from "os";
import { DashboardService } from "../src/workspace/dashboard-service.js";
import { ProjectRegistryService } from "../src/workspace/project-registry-service.js";
import { WorkspaceMetadataService } from "../src/workspace/workspace-metadata-service.js";
import { RunManager } from "../src/workspace/run-manager.js";
import { WorkspaceManager } from "../src/workspace/workspace-manager.js";

describe("DashboardService", () => {
  const tempBaseDir = path.join(homedir(), ".vulnerascan-test-dashboard");

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

  it("should aggregate empty project registry and metadata correctly", async () => {
    const service = new DashboardService(tempBaseDir);
    const summary = await service.getDashboardSummary();

    expect(summary.statistics.totalProjects).toBe(0);
    expect(summary.statistics.totalScans).toBe(0);
    expect(summary.statistics.totalDependencies).toBe(0);
    expect(summary.statistics.totalVulnerabilities).toBe(0);
    expect(summary.vulnerabilities.total).toBe(0);
    expect(summary.ecosystems.length).toBe(0);
  });

  it("should retrieve aggregated summary and filtering", async () => {
    const registryService = new ProjectRegistryService(tempBaseDir);
    const metadataService = new WorkspaceMetadataService(tempBaseDir);
    const runManager = new RunManager(tempBaseDir);

    const projectPath = path.join(tempBaseDir, "my-project");
    fs.mkdirSync(projectPath, { recursive: true });

    const wsManager = new WorkspaceManager(tempBaseDir);
    const workspace = await wsManager.findOrCreateWorkspace(projectPath, "node");
    const workspaceId = workspace.id;

    // Mock project registry entry using generated workspaceId
    const entry = await registryService.registerProject({
      path: projectPath,
      name: "my-project",
      ecosystem: "node",
      status: "vulnerable",
      workspaceId: workspaceId,
    });
    expect(entry).toBeDefined();

    const workspaceDir = path.join(tempBaseDir, workspaceId);

    const { ProjectType } = await import("../src/models/project-type.js");
    const run = await runManager.createRun(workspaceId, {
      type: ProjectType.Node,
      manifest: "package.json",
    });

    const runDir = path.join(workspaceDir, "runs", run.id);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const mockFindings = [
      {
        findingId: "GHSA-123",
        advisoryId: "GHSA-123",
        packageName: "foo",
        ecosystem: "npm",
        installedVersion: "1.0.0",
        summary: "Vulnerability Summary",
        aliases: [],
        references: [],
        isDirect: true,
        isTransitive: false,
        severity: [{ type: "CVSS_v3", score: "9.8" }], // Critical
      },
      {
        findingId: "GHSA-456",
        advisoryId: "GHSA-456",
        packageName: "bar",
        ecosystem: "npm",
        installedVersion: "2.0.0",
        summary: "Another Summary",
        aliases: [],
        references: [],
        isDirect: false,
        isTransitive: true,
        severity: [{ type: "CVSS_v3", score: "5.5" }], // Medium
      },
    ];

    await fs.promises.writeFile(
      path.join(runDir, "vulnerabilities.json"),
      JSON.stringify({
        schemaVersion: 1,
        timestamp: run.timestamp,
        totalPackagesScanned: 5,
        vulnerablePackages: 2,
        findings: mockFindings,
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
        status: "vulnerable",
        directDependencies: 2,
        totalDependencies: 5,
        vulnerabilitiesCount: 2,
      },
    );

    const service = new DashboardService(tempBaseDir);
    const summary = await service.getDashboardSummary();

    expect(summary.statistics.totalProjects).toBe(1);
    expect(summary.statistics.totalScans).toBe(1);
    expect(summary.statistics.totalDependencies).toBe(5);
    expect(summary.statistics.totalVulnerabilities).toBe(2);

    expect(summary.vulnerabilities.total).toBe(2);
    expect(summary.vulnerabilities.critical).toBe(1);
    expect(summary.vulnerabilities.medium).toBe(1);

    expect(summary.ecosystems.length).toBe(1);
    expect(summary.ecosystems[0].ecosystem).toBe("node");
    expect(summary.ecosystems[0].vulnerabilityCount).toBe(2);

    const timeline = await service.getScanTimeline();
    expect(timeline.length).toBe(1);
    expect(timeline[0].vulnerabilitiesCount).toBe(2);
    expect(timeline[0].projectName).toBe("my-project");

    // Test Ecosystem Filtering
    const filteredSummaryEco = await service.getDashboardSummary({ ecosystem: "python" });
    expect(filteredSummaryEco.statistics.totalProjects).toBe(0);

    // Test Severity Filtering
    const filteredProj = await service.getProjectSummaries({ severity: "critical" });
    expect(filteredProj.length).toBe(1);
    expect(filteredProj[0].vulnerabilities.total).toBe(1);
    expect(filteredProj[0].vulnerabilities.critical).toBe(1);
    expect(filteredProj[0].vulnerabilities.medium).toBe(0);
  });
});
