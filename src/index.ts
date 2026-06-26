export const VERSION = "0.0.3";

export { ProjectType, getProjectTypeDisplayName } from "./models/project-type.js";
export type { ProjectInfo } from "./models/project-info.js";
export { ProjectDiscoveryService } from "./discovery/project-discovery.js";

export { WorkspaceManager } from "./workspace/workspace-manager.js";
export { RunManager } from "./workspace/run-manager.js";
export type { Workspace } from "./workspace/models/workspace.js";
export type { Run } from "./workspace/models/run.js";

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
