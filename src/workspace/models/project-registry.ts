export interface ProjectRegistryEntry {
  id: string; // Unique project ID (e.g. SHA256 of path sliced or similar)
  name: string; // Project name (basename of path)
  path: string; // Absolute project path
  ecosystems: string[]; // Detected ecosystem(s) (e.g. ['node'], ['php'])
  firstDiscoveredAt: string; // First discovered timestamp
  lastScannedAt: string; // Last scanned timestamp
  status: "healthy" | "vulnerable" | "failed" | "unknown"; // Current status
  workspaceId: string; // Workspace identifier
}

export interface ProjectRegistry {
  schemaVersion: number;
  projects: Record<string, ProjectRegistryEntry>;
}
