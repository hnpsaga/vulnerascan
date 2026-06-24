export const VERSION = "0.0.3";

export { ProjectType, getProjectTypeDisplayName } from "./models/project-type.js";
export type { ProjectInfo } from "./models/project-info.js";
export { ProjectDiscoveryService } from "./discovery/project-discovery.js";
export type { ProjectDetector } from "./discovery/project-discovery.js";

export { WorkspaceManager } from "./workspace/workspace-manager.js";
export { RunManager } from "./workspace/run-manager.js";
export type { Workspace } from "./workspace/models/workspace.js";
export type { Run } from "./workspace/models/run.js";
export type { DiscoveryArtifact } from "./workspace/models/discovery.js";
export {
  WORKSPACE_SCHEMA_VERSION,
  RUN_SCHEMA_VERSION,
  DISCOVERY_SCHEMA_VERSION,
} from "./workspace/constants.js";
