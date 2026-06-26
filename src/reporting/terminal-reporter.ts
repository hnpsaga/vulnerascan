import { VulnerabilityDetectionResult } from "../vulnerability/vulnerability-models.js";
import { ReporterSummary } from "./models.js";
import { getSeverityRank, formatDependencyPath, truncateText } from "./formatter.js";

export class TerminalReporter {
  render(result: VulnerabilityDetectionResult, summary: ReporterSummary): void {
    console.log();
    console.log("=========================================");
    console.log("             SCAN SUMMARY                ");
    console.log("=========================================");
    console.log(`Scan Timestamp:   ${summary.timestamp}`);
    console.log(`Packages Scanned: ${summary.totalPackagesScanned}`);
    console.log(`Vulnerable Pkgs:  ${summary.vulnerablePackageCount}`);
    console.log(`Total Findings:   ${summary.totalFindings}`);
    console.log();
    console.log("Severity Breakdown:");
    console.log(`  Critical: ${summary.criticalCount}`);
    console.log(`  High:     ${summary.highCount}`);
    console.log(`  Medium:   ${summary.mediumCount}`);
    console.log(`  Low:      ${summary.lowCount}`);
    console.log(`  Unknown:  ${summary.unknownCount}`);
    console.log();
    console.log("Dependency Summary:");
    console.log(`  Direct:     ${summary.directDependencyCount}`);
    console.log(`  Transitive: ${summary.transitiveDependencyCount}`);
    console.log("=========================================");

    const findings = result.findings || [];
    if (findings.length === 0) {
      console.log();
      console.log("No vulnerabilities found.");
      console.log();
      return;
    }

    // Sort findings: Critical (4) > High (3) > Medium (2) > Low (1) > Unknown (0)
    const sortedFindings = [...findings].sort((a, b) => {
      const rankA = getSeverityRank(a.severity).score;
      const rankB = getSeverityRank(b.severity).score;
      if (rankA !== rankB) {
        return rankB - rankA;
      }
      return a.packageName.localeCompare(b.packageName);
    });

    console.log();
    console.log("Findings:");
    for (const finding of sortedFindings) {
      const severityInfo = getSeverityRank(finding.severity);
      const depType = finding.isDirect ? "direct" : "transitive";
      const depPathStr = formatDependencyPath(finding.dependencyPath);

      console.log();
      console.log(`[${severityInfo.label}] ${finding.packageName}@${finding.installedVersion}`);
      console.log(`  Advisory ID:     ${finding.advisoryId}`);
      if (finding.aliases && finding.aliases.length > 0) {
        console.log(`  Aliases:         ${finding.aliases.join(", ")}`);
      }
      console.log(`  Dependency Type: ${depType}`);
      if (depPathStr) {
        console.log(`  Dependency Path: ${depPathStr}`);
      }
      console.log(`  Summary:         ${truncateText(finding.summary, 100)}`);
    }
    console.log();
  }
}
