export interface ScanStats {
  directDependencies: number;
  totalDependencies: number;
  vulnerabilitiesCount: number;
}

export interface WorkspaceMetadata {
  schemaVersion: number;
  id: string; // Same as workspace ID
  name: string;
  sourcePath: string;
  ecosystems: string[]; // Current ecosystem(s)
  createdAt: string;
  lastScannedAt?: string;
  status: "healthy" | "vulnerable" | "failed" | "unknown";
  latestSuccessfulScan?: {
    runId: string;
    timestamp: string;
    stats?: ScanStats;
  };
  latestFailedScan?: {
    runId: string;
    timestamp: string;
    error?: string;
  };
  stats?: ScanStats;
}

export interface RunIndexEntry {
  runId: string;
  timestamp: string;
  name?: string;
  status: "completed" | "failed";
  durationMs?: number;
  ecosystem?: string;
}

export interface RunIndex {
  schemaVersion: number;
  runs: RunIndexEntry[];
}
