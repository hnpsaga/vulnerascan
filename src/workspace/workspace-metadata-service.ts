import { WorkspaceMetadata, RunIndex, RunIndexEntry } from "./models/workspace-metadata.js";
import path from "path";
import fs from "fs";
import { homedir } from "os";

export class WorkspaceMetadataService {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      this.baseDir = path.join(home, ".vulnerascan", "workspaces");
    }
  }

  private getMetadataPath(workspaceId: string): string {
    return path.join(this.baseDir, workspaceId, "metadata.json");
  }

  private getRunIndexPath(workspaceId: string): string {
    return path.join(this.baseDir, workspaceId, "run-index.json");
  }

  async getMetadata(workspaceId: string): Promise<WorkspaceMetadata | undefined> {
    const filePath = this.getMetadataPath(workspaceId);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    const content = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(content) as WorkspaceMetadata;
  }

  async saveMetadata(metadata: WorkspaceMetadata): Promise<void> {
    const filePath = this.getMetadataPath(metadata.id);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf8");
  }

  async getOrCreateMetadata(
    workspaceId: string,
    options: {
      name: string;
      sourcePath: string;
      ecosystem: string;
    },
  ): Promise<WorkspaceMetadata> {
    let metadata = await this.getMetadata(workspaceId);
    if (!metadata) {
      metadata = {
        schemaVersion: 1,
        id: workspaceId,
        name: options.name,
        sourcePath: options.sourcePath,
        ecosystems: [options.ecosystem],
        createdAt: new Date().toISOString(),
        status: "unknown",
      };
      await this.saveMetadata(metadata);
    } else {
      // Keep name, sourcePath updated and ensure ecosystem is added if not present
      metadata.name = options.name;
      metadata.sourcePath = options.sourcePath;
      if (!metadata.ecosystems.includes(options.ecosystem)) {
        metadata.ecosystems.push(options.ecosystem);
      }
      await this.saveMetadata(metadata);
    }
    return metadata;
  }

  async getRunIndex(workspaceId: string): Promise<RunIndex> {
    const filePath = this.getRunIndexPath(workspaceId);
    if (!fs.existsSync(filePath)) {
      return { schemaVersion: 1, runs: [] };
    }
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(content) as RunIndex;
    } catch {
      return { schemaVersion: 1, runs: [] };
    }
  }

  async saveRunIndex(workspaceId: string, runIndex: RunIndex): Promise<void> {
    const filePath = this.getRunIndexPath(workspaceId);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, JSON.stringify(runIndex, null, 2), "utf8");
  }

  async recordRun(
    workspaceId: string,
    runEntry: RunIndexEntry,
    scanDetails?: {
      status: "healthy" | "vulnerable" | "failed" | "unknown";
      directDependencies?: number;
      totalDependencies?: number;
      vulnerabilitiesCount?: number;
      error?: string;
    },
  ): Promise<void> {
    // 1. Update run-index.json
    const runIndex = await this.getRunIndex(workspaceId);
    // Remove if already exists to avoid duplicates
    runIndex.runs = runIndex.runs.filter((r) => r.runId !== runEntry.runId);
    runIndex.runs.push(runEntry);
    // Sort runs chronologically (latest first, or earliest first depending on need, let's keep chronologically earliest-first or latest-first. Usually timeline is sorted chronologically)
    runIndex.runs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    await this.saveRunIndex(workspaceId, runIndex);

    // 2. Update metadata.json
    const workspaceJsonPath = path.join(this.baseDir, workspaceId, "workspace.json");
    let name = workspaceId;
    let sourcePath = "";
    let projectType = "node";
    if (fs.existsSync(workspaceJsonPath)) {
      const content = fs.readFileSync(workspaceJsonPath, "utf8");
      const wsData = JSON.parse(content) as {
        name: string;
        sourcePath: string;
        projectType: string;
      };
      name = wsData.name || workspaceId;
      sourcePath = wsData.sourcePath || "";
      projectType = wsData.projectType || "node";
    }

    const metadata = await this.getOrCreateMetadata(workspaceId, {
      name,
      sourcePath,
      ecosystem: runEntry.ecosystem || projectType,
    });

    metadata.lastScannedAt = runEntry.timestamp;
    if (scanDetails) {
      metadata.status = scanDetails.status;
      if (scanDetails.status === "failed") {
        metadata.latestFailedScan = {
          runId: runEntry.runId,
          timestamp: runEntry.timestamp,
          error: scanDetails.error,
        };
      } else {
        const stats = {
          directDependencies: scanDetails.directDependencies || 0,
          totalDependencies: scanDetails.totalDependencies || 0,
          vulnerabilitiesCount: scanDetails.vulnerabilitiesCount || 0,
        };
        metadata.latestSuccessfulScan = {
          runId: runEntry.runId,
          timestamp: runEntry.timestamp,
          stats,
        };
        metadata.stats = stats;
      }
    } else {
      metadata.status = runEntry.status === "completed" ? "healthy" : "failed";
    }

    await this.saveMetadata(metadata);
  }
}
