export interface DependencyNode {
  id: string; // Ecosystem-scoped package identity, e.g., "npm:foo@1.0.0"
  name: string;
  version: string;
  ecosystem: string;
  dependencyType: "production" | "development" | "optional" | "peer";
  isDirect: boolean;
  isTransitive: boolean;
  parents: string[]; // Array of parent node IDs
  children: string[]; // Array of child node IDs
}

export interface DependencyEdge {
  source: string; // Parent node ID
  target: string; // Child node ID
}

export interface DependencyGraph {
  schemaVersion: number;
  projectType: string;
  packageManager: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}
