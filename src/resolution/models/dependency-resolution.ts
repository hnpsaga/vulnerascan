import { DependencyGraph } from "./dependency-graph.js";

export interface DependencyResolutionSuccess {
  schemaVersion: number;
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
