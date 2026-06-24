import { DependencyGraph } from "./dependency-graph.js";

export interface DependencySummary {
  directDependencies: number;
  totalDependencies: number;
  graph?: DependencyGraph;
}

