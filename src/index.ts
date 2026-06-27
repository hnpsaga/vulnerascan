import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPackageVersion(): string {
  try {
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
      const packageJsonPath = path.join(currentDir, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, "utf8");
        const pkg = JSON.parse(content) as { version?: string };
        if (pkg.version) {
          return pkg.version;
        }
      }
      currentDir = path.dirname(currentDir);
    }
  } catch {
    // ignore
  }
  return "0.0.3";
}

export const VERSION = getPackageVersion();


export { ProjectType, getProjectTypeDisplayName } from "./models/project-type.js";
export type { ProjectInfo } from "./models/project-info.js";
export { ProjectDiscoveryService } from "./discovery/project-discovery.js";

export { WorkspaceManager } from "./workspace/workspace-manager.js";
export { RunManager } from "./workspace/run-manager.js";
export { ProjectRegistryService } from "./workspace/project-registry-service.js";
export { WorkspaceMetadataService } from "./workspace/workspace-metadata-service.js";
export { WorkspaceApiService } from "./workspace/workspace-api-service.js";
export type { Workspace } from "./workspace/models/workspace.js";
export type { Run } from "./workspace/models/run.js";
export type { ProjectRegistry, ProjectRegistryEntry } from "./workspace/models/project-registry.js";
export type {
  WorkspaceMetadata,
  RunIndex,
  RunIndexEntry,
  ScanStats,
} from "./workspace/models/workspace-metadata.js";

export { DependencyResolutionService } from "./resolution/dependency-resolution-service.js";
export type { DependencyResolution } from "./resolution/models/dependency-resolution.js";
export type {
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
} from "./resolution/models/dependency-graph.js";

export * from "./provider/index.js";
export { VulnerabilityDetector } from "./vulnerability/detector.js";
export type {
  VulnerabilityFinding,
  VulnerabilityDetectionResult,
} from "./vulnerability/vulnerability-models.js";

export { DashboardService } from "./workspace/dashboard-service.js";
export type {
  VulnerabilitySummary,
  EcosystemSummary,
  ScanSummary,
  ProjectSummary,
  DashboardSummary,
  HistoricalScanSummary,
} from "./models/dashboard.js";
