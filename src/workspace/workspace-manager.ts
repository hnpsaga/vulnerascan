import { Workspace } from "./models/workspace.js";
import path from "path";
import fs from "fs";
import { homedir } from "os";
import crypto from "crypto";

export class WorkspaceManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      this.baseDir = path.join(home, ".vulnerascan", "workspaces");
    }
  }

  async findOrCreateWorkspace(projectPath: string, projectType: string): Promise<Workspace> {
    const normalizedPath = path.resolve(projectPath);
    const id = this.generateWorkspaceId(normalizedPath);
    const workspaceDir = path.join(this.baseDir, id);
    const metadataPath = path.join(workspaceDir, "workspace.json");

    if (fs.existsSync(metadataPath)) {
      const content = fs.readFileSync(metadataPath, "utf8");
      const workspace = JSON.parse(content) as Workspace;

      workspace.lastRunAt = new Date().toISOString();
      await this.saveWorkspace(workspace);
      return workspace;
    }

    // Create directories
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, "manifests"), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, "generated"), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, "cache"), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, "runs"), { recursive: true });

    const now = new Date().toISOString();
    const name = path.basename(normalizedPath) || "root";
    const workspace: Workspace = {
      id,
      name,
      sourcePath: normalizedPath,
      projectType,
      createdAt: now,
      lastRunAt: now,
    };

    await this.saveWorkspace(workspace);
    return workspace;
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    const workspaceDir = path.join(this.baseDir, workspace.id);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    const metadataPath = path.join(workspaceDir, "workspace.json");
    await fs.promises.writeFile(metadataPath, JSON.stringify(workspace, null, 2), "utf8");
  }

  private generateWorkspaceId(projectPath: string): string {
    return crypto.createHash("sha256").update(projectPath).digest("hex").slice(0, 8);
  }
}
