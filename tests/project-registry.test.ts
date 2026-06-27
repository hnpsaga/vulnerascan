import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { ProjectRegistryService } from "../src/workspace/project-registry-service.js";
import { WorkspaceMetadataService } from "../src/workspace/workspace-metadata-service.js";
import { WorkspaceApiService } from "../src/workspace/workspace-api-service.js";
import { ProjectType } from "../src/models/project-type.js";

const TEST_DIR = join(import.meta.dirname, "tmp-registry-tests");

describe("Global Registry & Metadata & Workspace APIs", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("ProjectRegistryService registers and lists projects", async () => {
    const service = new ProjectRegistryService(TEST_DIR);

    // Initial registry should be empty
    let list = await service.listProjects();
    expect(list.length).toBe(0);

    const entry1 = await service.registerProject({
      path: join(TEST_DIR, "proj-1"),
      name: "proj-1",
      ecosystem: ProjectType.Node,
      status: "healthy",
      workspaceId: "ws123",
    });

    expect(entry1.id).toBeDefined();
    expect(entry1.name).toBe("proj-1");
    expect(entry1.ecosystems).toContain("node");
    expect(entry1.status).toBe("healthy");

    // Register again / update
    const entry1_updated = await service.registerProject({
      path: join(TEST_DIR, "proj-1"),
      name: "proj-1",
      ecosystem: ProjectType.PHP,
      status: "vulnerable",
      workspaceId: "ws123",
    });

    expect(entry1_updated.id).toBe(entry1.id);
    expect(entry1_updated.ecosystems).toContain("node");
    expect(entry1_updated.ecosystems).toContain("php");
    expect(entry1_updated.status).toBe("vulnerable");

    // Duplicate registration under a different name/same path
    const entry2 = await service.registerProject({
      path: join(TEST_DIR, "proj-2"),
      name: "proj-2",
      ecosystem: ProjectType.Node,
      status: "unknown",
      workspaceId: "ws456",
    });

    list = await service.listProjects();
    expect(list.length).toBe(2);

    const lookup = await service.getProject(entry2.id);
    expect(lookup).toBeDefined();
    expect(lookup?.name).toBe("proj-2");
  });

  it("WorkspaceMetadataService records runs and creates run index", async () => {
    const service = new WorkspaceMetadataService(TEST_DIR);
    const workspaceId = "ws123";

    await service.recordRun(
      workspaceId,
      {
        runId: "run1",
        timestamp: "2026-06-27T00:00:00Z",
        name: "First Run",
        status: "completed",
        durationMs: 150,
        ecosystem: "node",
      },
      {
        status: "healthy",
        directDependencies: 5,
        totalDependencies: 20,
        vulnerabilitiesCount: 0,
      },
    );

    const metadata = await service.getMetadata(workspaceId);
    expect(metadata).toBeDefined();
    expect(metadata?.status).toBe("healthy");
    expect(metadata?.stats?.totalDependencies).toBe(20);
    expect(metadata?.latestSuccessfulScan?.runId).toBe("run1");

    // Record a failed run
    await service.recordRun(
      workspaceId,
      {
        runId: "run2",
        timestamp: "2026-06-27T01:00:00Z",
        name: "Second Run",
        status: "failed",
        ecosystem: "node",
      },
      {
        status: "failed",
        error: "Broken resolution",
      },
    );

    const updatedMetadata = await service.getMetadata(workspaceId);
    expect(updatedMetadata?.status).toBe("failed");
    expect(updatedMetadata?.latestFailedScan?.runId).toBe("run2");
    expect(updatedMetadata?.latestFailedScan?.error).toBe("Broken resolution");

    const runIndex = await service.getRunIndex(workspaceId);
    expect(runIndex.runs.length).toBe(2);
    expect(runIndex.runs[0].runId).toBe("run1");
    expect(runIndex.runs[1].runId).toBe("run2");
  });

  it("WorkspaceApiService wraps registry and metadata service correctly", async () => {
    const api = new WorkspaceApiService(TEST_DIR);

    const project = await api.registerProject({
      path: join(TEST_DIR, "proj-api"),
      ecosystem: "node",
      status: "healthy",
      workspaceId: "ws-api",
    });

    const list = await api.listProjects();
    expect(list.length).toBe(1);

    const details = await api.lookupProject(project.id);
    expect(details?.path).toBe(project.path);
  });
});
