import { VulnerabilityDetectionResult } from "../vulnerability/vulnerability-models.js";
import { getSeverityRank, escapeCsvValue, formatDependencyPath } from "./formatter.js";

export class CsvReporter {
  generate(result: VulnerabilityDetectionResult): string {
    const columns = [
      "Package",
      "Ecosystem",
      "Installed Version",
      "Severity",
      "Advisory ID",
      "Aliases",
      "Direct/Transitive",
      "Dependency Path",
      "Summary",
      "Published Date",
      "Modified Date",
    ];

    const lines: string[] = [columns.join(",")];

    const findings = result.findings || [];

    // Sort findings deterministically for stable output: packageName, then version, then advisoryId
    const sortedFindings = [...findings].sort((a, b) => {
      const cmpName = a.packageName.localeCompare(b.packageName);
      if (cmpName !== 0) return cmpName;
      const cmpVer = a.installedVersion.localeCompare(b.installedVersion);
      if (cmpVer !== 0) return cmpVer;
      return a.advisoryId.localeCompare(b.advisoryId);
    });

    for (const finding of sortedFindings) {
      const severityInfo = getSeverityRank(finding.severity);
      const aliasesStr = (finding.aliases || []).join(";");
      const depType = finding.isDirect ? "Direct" : "Transitive";
      const depPathStr = formatDependencyPath(finding.dependencyPath);

      const row = [
        escapeCsvValue(finding.packageName),
        escapeCsvValue(finding.ecosystem),
        escapeCsvValue(finding.installedVersion),
        escapeCsvValue(severityInfo.label),
        escapeCsvValue(finding.advisoryId),
        escapeCsvValue(aliasesStr),
        escapeCsvValue(depType),
        escapeCsvValue(depPathStr),
        escapeCsvValue(finding.summary),
        escapeCsvValue(finding.publishedAt),
        escapeCsvValue(finding.modifiedAt),
      ];

      lines.push(row.join(","));
    }

    // Keep output deterministic and spreadsheet-friendly with a trailing newline
    return lines.join("\n") + "\n";
  }
}
