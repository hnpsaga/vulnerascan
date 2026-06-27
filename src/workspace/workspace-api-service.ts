import { ProjectRegistryService } from "./project-registry-service.js";
import { WorkspaceMetadataService } from "./workspace-metadata-service.js";
import { ProjectRegistryEntry } from "./models/project-registry.js";
import { WorkspaceMetadata, RunIndexEntry } from "./models/workspace-metadata.js";

export class WorkspaceApiService {
  public registryService: ProjectRegistryService;
  public metadataService: WorkspaceMetadataService;

  constructor(baseDir?: string) {
    this.registryService = new ProjectRegistryService(baseDir);
    this.metadataService = new WorkspaceMetadataService(baseDir);
  }

  async registerProject(project: {
    path: string;
    name?: string;
    ecosystem: string;
    status: "healthy" | "vulnerable" | "failed" | "unknown";
    workspaceId: string;
  }): Promise<ProjectRegistryEntry> {
    return this.registryService.registerProject(project);
  }

  async lookupProject(id: string): Promise<ProjectRegistryEntry | undefined> {
    return this.registryService.getProject(id);
  }

  async listProjects(): Promise<ProjectRegistryEntry[]> {
    return this.registryService.listProjects();
  }

  async getWorkspaceMetadata(workspaceId: string): Promise<WorkspaceMetadata | undefined> {
    return this.metadataService.getMetadata(workspaceId);
  }

  async getScanHistory(workspaceId: string): Promise<RunIndexEntry[]> {
    const runIndex = await this.metadataService.getRunIndex(workspaceId);
    return runIndex.runs;
  }

  async getLatestScan(workspaceId: string): Promise<RunIndexEntry | undefined> {
    const history = await this.getScanHistory(workspaceId);
    if (history.length === 0) {
      return undefined;
    }
    // Return chronologically latest (runs list is sorted chronologically earliest to latest)
    return history[history.length - 1];
  }

  async getRunSummaries(workspaceId: string): Promise<RunIndexEntry[]> {
    return this.getScanHistory(workspaceId);
  }
}
