import { DependencyGraph } from "./dependency-graph.js";

export interface DependencyResolutionSuccess {
  schemaVersion: number;
  workspaceId?: string;
  projectId?: string;
  scanId?: string;
  manifestPath?: string;
  lockfilePath?: string;
  manifestHash?: string;
  lockfileHash?: string;
  projectType: string;
  packageManager: string;
  resolutionSource: "existing-lockfile" | "generated-lockfile";
  directDependencies: number;
  totalDependencies: number;
  status?: never;
  graph?: DependencyGraph;
}

export interface DependencyResolutionFailure {
  schemaVersion: number;
  status: "failed";
  reason: string;
}

export type DependencyResolution = DependencyResolutionSuccess | DependencyResolutionFailure;
