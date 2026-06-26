import { VulnerabilityDetectionResult } from "../vulnerability/vulnerability-models.js";
import { ReporterSummary } from "./models.js";
import { getSeverityRank } from "./formatter.js";

export function calculateSummary(result: VulnerabilityDetectionResult): ReporterSummary {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let unknownCount = 0;

  let directDependencyCount = 0;
  let transitiveDependencyCount = 0;

  const findings = result.findings || [];

  for (const finding of findings) {
    const { label } = getSeverityRank(finding.severity);
    switch (label) {
      case "CRITICAL":
        criticalCount++;
        break;
      case "HIGH":
        highCount++;
        break;
      case "MEDIUM":
        mediumCount++;
        break;
      case "LOW":
        lowCount++;
        break;
      default:
        unknownCount++;
        break;
    }

    if (finding.isDirect) {
      directDependencyCount++;
    } else if (finding.isTransitive) {
      transitiveDependencyCount++;
    }
  }

  return {
    timestamp: result.timestamp || new Date().toISOString(),
    totalFindings: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    unknownCount,
    directDependencyCount,
    transitiveDependencyCount,
    vulnerablePackageCount: result.vulnerablePackages ?? 0,
    totalPackagesScanned: result.totalPackagesScanned ?? 0,
  };
}
