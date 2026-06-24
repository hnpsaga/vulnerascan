import { Run } from "./models/run.js";
import { ProjectInfo } from "../models/project-info.js";
import { DiscoveryArtifact } from "./models/discovery.js";
import { RUN_SCHEMA_VERSION, DISCOVERY_SCHEMA_VERSION } from "./constants.js";
import path from "path";
import fs from "fs";
import { homedir } from "os";

export class RunManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      this.baseDir = path.join(home, ".vulnerascan", "workspaces");
    }
  }

  async createRun(
    workspaceId: string,
    projectInfo: ProjectInfo,
    options?: { name?: string },
  ): Promise<Run> {
    const workspaceDir = path.join(this.baseDir, workspaceId);
    if (!fs.existsSync(workspaceDir)) {
      throw new Error(`Workspace with ID ${workspaceId} does not exist.`);
    }

    const runsDir = path.join(workspaceDir, "runs");
    if (!fs.existsSync(runsDir)) {
      fs.mkdirSync(runsDir, { recursive: true });
    }

    const date = new Date();
    const runId = this.formatTimestampId(date);
    const runDir = path.join(runsDir, runId);
    fs.mkdirSync(runDir, { recursive: true });

    // Read workspace.json to get sourcePath
    const workspaceJsonPath = path.join(workspaceDir, "workspace.json");
    let sourcePath = "";
    if (fs.existsSync(workspaceJsonPath)) {
      const workspaceContent = fs.readFileSync(workspaceJsonPath, "utf8");
      const workspaceData = JSON.parse(workspaceContent) as { sourcePath: string };
      sourcePath = workspaceData.sourcePath;
    }

    const run: Run = {
      schemaVersion: RUN_SCHEMA_VERSION,
      id: runId,
      timestamp: date.toISOString(),
      status: "completed",
    };
    if (options?.name) {
      run.name = options.name;
    }

    // Persist run metadata (run.json)
    const runJsonPath = path.join(runDir, "run.json");
    await fs.promises.writeFile(runJsonPath, JSON.stringify(run, null, 2), "utf8");

    // Persist discovery results (discovery.json)
    const discoveryJsonPath = path.join(runDir, "discovery.json");
    const discoveryData: DiscoveryArtifact = {
      schemaVersion: DISCOVERY_SCHEMA_VERSION,
      projectType: projectInfo.type,
      manifest: projectInfo.manifest,
      sourcePath,
    };
    await fs.promises.writeFile(discoveryJsonPath, JSON.stringify(discoveryData, null, 2), "utf8");

    return run;
  }

  private formatTimestampId(date: Date): string {
    const pad = (num: number): string => String(num).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
  }
}
