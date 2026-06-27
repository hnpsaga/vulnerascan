import fs from "fs";
import path from "path";
import crypto from "crypto";
import { homedir } from "os";
import { ProjectRegistry, ProjectRegistryEntry } from "./models/project-registry.js";

export class ProjectRegistryService {
  private registryPath: string;

  constructor(baseDir?: string) {
    let rootDir: string;
    if (baseDir) {
      rootDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      rootDir = path.join(home, ".vulnerascan");
    }
    this.registryPath = path.join(rootDir, "projects.json");
  }

  async getRegistry(): Promise<ProjectRegistry> {
    try {
      if (fs.existsSync(this.registryPath)) {
        const content = await fs.promises.readFile(this.registryPath, "utf8");
        return JSON.parse(content) as ProjectRegistry;
      }
    } catch {
      // Ignore reading error, return a fresh registry
    }
    return { schemaVersion: 1, projects: {} };
  }

  async saveRegistry(registry: ProjectRegistry): Promise<void> {
    const parentDir = path.dirname(this.registryPath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(this.registryPath, JSON.stringify(registry, null, 2), "utf8");
  }

  async registerProject(project: {
    path: string;
    name?: string;
    ecosystem: string;
    status: "healthy" | "vulnerable" | "failed" | "unknown";
    workspaceId: string;
  }): Promise<ProjectRegistryEntry> {
    const normalizedPath = path.resolve(project.path);
    const registry = await this.getRegistry();

    // Look for existing project with this path
    let entry = Object.values(registry.projects).find(
      (p) => path.resolve(p.path) === normalizedPath,
    );

    const now = new Date().toISOString();

    if (entry) {
      // Update existing entry
      entry.lastScannedAt = now;
      entry.status = project.status;
      if (!entry.ecosystems.includes(project.ecosystem)) {
        entry.ecosystems.push(project.ecosystem);
      }
      registry.projects[entry.id] = entry;
    } else {
      // Create a new project ID based on path hash
      const id = crypto.createHash("sha256").update(normalizedPath).digest("hex").slice(0, 8);
      entry = {
        id,
        name: project.name || path.basename(normalizedPath) || "root",
        path: normalizedPath,
        ecosystems: [project.ecosystem],
        firstDiscoveredAt: now,
        lastScannedAt: now,
        status: project.status,
        workspaceId: project.workspaceId,
      };
      registry.projects[id] = entry;
    }

    await this.saveRegistry(registry);
    return entry;
  }

  async getProject(id: string): Promise<ProjectRegistryEntry | undefined> {
    const registry = await this.getRegistry();
    return registry.projects[id];
  }

  async listProjects(): Promise<ProjectRegistryEntry[]> {
    const registry = await this.getRegistry();
    return Object.values(registry.projects);
  }
}
