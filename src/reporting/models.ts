import { VulnerabilityFinding } from "../vulnerability/vulnerability-models.js";

export type ReporterFinding = VulnerabilityFinding;

export interface ReporterSeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

export interface ReporterSummary {
  timestamp: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unknownCount: number;
  directDependencyCount: number;
  transitiveDependencyCount: number;
  vulnerablePackageCount: number;
  totalPackagesScanned: number;
}
