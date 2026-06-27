export interface VulnerabilitySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

export interface EcosystemSummary {
  ecosystem: string;
  projectCount: number;
  vulnerabilityCount: number;
}

export interface ScanSummary {
  runId: string;
  timestamp: string;
  status: "completed" | "failed";
  directDependencies: number;
  totalDependencies: number;
  vulnerabilitiesCount: number;
  durationMs?: number;
  error?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  ecosystems: string[];
  firstDiscoveredAt: string;
  lastScannedAt: string;
  status: "healthy" | "vulnerable" | "failed" | "unknown";
  workspaceId: string;
  latestScan?: ScanSummary;
  vulnerabilities: VulnerabilitySummary;
}

export interface DashboardSummary {
  statistics: {
    totalProjects: number;
    totalScans: number;
    totalDependencies: number;
    totalVulnerabilities: number;
    latestScanTimestamp?: string;
  };
  vulnerabilities: VulnerabilitySummary;
  ecosystems: EcosystemSummary[];
  projects: ProjectSummary[];
}

export interface HistoricalScanSummary {
  runId: string;
  timestamp: string;
  status: "completed" | "failed";
  directDependencies: number;
  totalDependencies: number;
  vulnerabilitiesCount: number;
  ecosystem?: string;
  projectName?: string;
}
