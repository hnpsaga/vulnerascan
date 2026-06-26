import {
  VulnerabilityDetectionResult,
  VulnerabilityFinding,
} from "../vulnerability/vulnerability-models.js";
import { ReporterSummary } from "./models.js";
import { getSeverityRank, formatDependencyPath } from "./formatter.js";

export class MarkdownReporter {
  generate(result: VulnerabilityDetectionResult, summary: ReporterSummary): string {
    const lines: string[] = [];

    lines.push("# Vulnerability Scan Report");
    lines.push("");
    lines.push(`*Scan Timestamp:* ${summary.timestamp}  `);
    lines.push(`*Packages Scanned:* ${summary.totalPackagesScanned}  `);
    lines.push(`*Vulnerable Packages:* ${summary.vulnerablePackageCount}  `);
    lines.push(`*Total Findings:* ${summary.totalFindings}  `);
    lines.push("");

    lines.push("## Severity Summary");
    lines.push("");
    lines.push("| Severity | Count |");
    lines.push("| --- | --- |");
    lines.push(`| Critical | ${summary.criticalCount} |`);
    lines.push(`| High | ${summary.highCount} |`);
    lines.push(`| Medium | ${summary.mediumCount} |`);
    lines.push(`| Low | ${summary.lowCount} |`);
    lines.push(`| Unknown | ${summary.unknownCount} |`);
    lines.push("");

    lines.push("## Dependency Summary");
    lines.push("");
    lines.push(`- **Direct Dependencies Affected:** ${summary.directDependencyCount}`);
    lines.push(`- **Transitive Dependencies Affected:** ${summary.transitiveDependencyCount}`);
    lines.push("");

    lines.push("## Vulnerability Findings");
    lines.push("");

    const findings = result.findings || [];
    if (findings.length === 0) {
      lines.push("No vulnerabilities detected.");
      lines.push("");
      return lines.join("\n");
    }

    // Group findings by severity
    const grouped: Record<string, VulnerabilityFinding[]> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
      UNKNOWN: [],
    };

    for (const finding of findings) {
      const severityInfo = getSeverityRank(finding.severity);
      grouped[severityInfo.label].push(finding);
    }

    const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];

    for (const severity of severityOrder) {
      const list = grouped[severity];
      if (!list || list.length === 0) {
        continue;
      }

      // Sort by package name
      list.sort((a, b) => a.packageName.localeCompare(b.packageName));

      lines.push(`### ${severity} (${list.length})`);
      lines.push("");

      for (const finding of list) {
        lines.push(`#### ${finding.packageName}@${finding.installedVersion}`);
        lines.push("");
        lines.push(`- **Advisory ID:** ${finding.advisoryId}`);
        if (finding.aliases && finding.aliases.length > 0) {
          lines.push(`- **Aliases:** ${finding.aliases.join(", ")}`);
        }
        lines.push(`- **Ecosystem:** ${finding.ecosystem}`);
        lines.push(`- **Dependency Type:** ${finding.isDirect ? "Direct" : "Transitive"}`);
        const depPathStr = formatDependencyPath(finding.dependencyPath);
        if (depPathStr) {
          lines.push(`- **Dependency Path:** \`${depPathStr}\``);
        }
        if (finding.summary) {
          lines.push(`- **Summary:** ${finding.summary}`);
        }
        if (finding.details) {
          lines.push("- **Details:**");
          lines.push("  ```text");
          const detailedLines = finding.details.split("\n").map((l) => "  " + l);
          lines.push(detailedLines.join("\n"));
          lines.push("  ```");
        }
        if (finding.references && finding.references.length > 0) {
          lines.push("- **References:**");
          for (const ref of finding.references) {
            lines.push(`  - [${ref.identifier || ref.source || "Link"}](${ref.url})`);
          }
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}
