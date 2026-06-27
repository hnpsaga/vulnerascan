import {
  VulnerabilityDetectionResult,
  VulnerabilityFinding,
} from "../../vulnerability/vulnerability-models.js";
import { DependencyGraph } from "../../resolution/models/dependency-graph.js";

export interface LlmContextJson {
  project: {
    name: string;
    ecosystem?: string;
    timestamp: string;
  };
  summary: {
    totalPackagesScanned: number;
    vulnerablePackages: number;
    totalVulnerabilities: number;
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    };
  };
  highestRiskFindings: Array<{
    advisoryId: string;
    packageName: string;
    installedVersion: string;
    severityScore?: string;
    severityLevel: string;
    summary: string;
    remediationAction: string;
  }>;
  remediationPriorities: Array<{
    packageName: string;
    currentVersion: string;
    recommendedAction: string;
    vulnerabilityCount: number;
    highestSeverity: string;
  }>;
}

function getSeverityCategory(
  scoreStr?: string,
): "critical" | "high" | "medium" | "low" | "unknown" {
  if (!scoreStr) return "unknown";
  const score = parseFloat(scoreStr);
  if (!isNaN(score)) {
    if (score >= 9.0) return "critical";
    if (score >= 7.0) return "high";
    if (score >= 4.0) return "medium";
    if (score >= 0.1) return "low";
  }
  const lower = scoreStr.toLowerCase();
  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("medium")) return "medium";
  if (lower.includes("low")) return "low";
  return "unknown";
}

function getNumericScore(finding: VulnerabilityFinding): number {
  const scoreObj =
    finding.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || finding.severity?.[0];
  if (!scoreObj || !scoreObj.score) return 0;
  const score = parseFloat(scoreObj.score);
  if (!isNaN(score)) return score;
  const lower = scoreObj.score.toLowerCase();
  if (lower.includes("critical")) return 9.5;
  if (lower.includes("high")) return 8.0;
  if (lower.includes("medium")) return 5.5;
  if (lower.includes("low")) return 2.0;
  return 0;
}

export function generateLlmContextJson(
  result: VulnerabilityDetectionResult,
  graph?: DependencyGraph,
  projectName?: string,
): LlmContextJson {
  const name = projectName || "vulnerascan-project";
  const ecosystem = graph?.projectType || result.findings?.[0]?.ecosystem;
  const timestamp = result.timestamp || new Date().toISOString();

  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };

  for (const finding of result.findings) {
    const scoreObj =
      finding.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || finding.severity?.[0];
    const cat = getSeverityCategory(scoreObj?.score);
    severityCounts[cat]++;
  }

  // Sort findings by severity
  const sortedFindings = [...result.findings].sort(
    (a, b) => getNumericScore(b) - getNumericScore(a),
  );

  const highestRiskFindings = sortedFindings.slice(0, 5).map((f) => {
    const scoreObj = f.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || f.severity?.[0];
    const severityLevel = getSeverityCategory(scoreObj?.score);
    const scoreVal = scoreObj?.score;

    return {
      advisoryId: f.advisoryId,
      packageName: f.packageName,
      installedVersion: f.installedVersion,
      severityScore: scoreVal,
      severityLevel,
      summary: f.summary,
      remediationAction: `Check advisory details for fixed version for ${f.packageName}.`,
    };
  });

  // Group by package for remediation priorities
  const packageMap = new Map<string, VulnerabilityFinding[]>();
  for (const finding of result.findings) {
    const current = packageMap.get(finding.packageName) || [];
    current.push(finding);
    packageMap.set(finding.packageName, current);
  }

  const remediationPriorities = Array.from(packageMap.entries())
    .map(([packageName, pkgFindings]) => {
      const highestScoreFinding = [...pkgFindings].sort(
        (a, b) => getNumericScore(b) - getNumericScore(a),
      )[0];
      const scoreObj =
        highestScoreFinding.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") ||
        highestScoreFinding.severity?.[0];
      const highestSeverity = getSeverityCategory(scoreObj?.score);

      return {
        packageName,
        currentVersion: highestScoreFinding.installedVersion,
        recommendedAction: `Update ${packageName} to address ${pkgFindings.length} vulnerabilities (highest severity: ${highestSeverity}).`,
        vulnerabilityCount: pkgFindings.length,
        highestSeverity,
      };
    })
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
      const orderA = severityOrder[a.highestSeverity] || 0;
      const orderB = severityOrder[b.highestSeverity] || 0;
      if (orderB !== orderA) return orderB - orderA;
      return b.vulnerabilityCount - a.vulnerabilityCount;
    });

  return {
    project: {
      name,
      ecosystem,
      timestamp,
    },
    summary: {
      totalPackagesScanned: result.totalPackagesScanned,
      vulnerablePackages: result.vulnerablePackages,
      totalVulnerabilities: result.findings.length,
      severityCounts,
    },
    highestRiskFindings,
    remediationPriorities,
  };
}

export function generateLlmContextMd(jsonData: LlmContextJson): string {
  const lines: string[] = [];
  lines.push(`# AI Security Context: ${jsonData.project.name}`);
  lines.push("");
  lines.push(`**Generated At:** ${jsonData.project.timestamp}`);
  if (jsonData.project.ecosystem) {
    lines.push(`**Ecosystem:** ${jsonData.project.ecosystem}`);
  }
  lines.push("");
  lines.push("## Security Posture Summary");
  lines.push("");
  lines.push(`* **Total Packages Scanned:** ${jsonData.summary.totalPackagesScanned}`);
  lines.push(`* **Vulnerable Packages:** ${jsonData.summary.vulnerablePackages}`);
  lines.push(`* **Total Vulnerabilities:** ${jsonData.summary.totalVulnerabilities}`);
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("| --- | --- |");
  lines.push(`| Critical | ${jsonData.summary.severityCounts.critical} |`);
  lines.push(`| High | ${jsonData.summary.severityCounts.high} |`);
  lines.push(`| Medium | ${jsonData.summary.severityCounts.medium} |`);
  lines.push(`| Low | ${jsonData.summary.severityCounts.low} |`);
  lines.push(`| Unknown | ${jsonData.summary.severityCounts.unknown} |`);
  lines.push("");

  if (jsonData.highestRiskFindings.length > 0) {
    lines.push("## Highest-Risk Findings");
    lines.push("");
    for (const f of jsonData.highestRiskFindings) {
      const scorePart = f.severityScore ? ` (CVSS: ${f.severityScore})` : "";
      lines.push(`### ${f.advisoryId} - ${f.packageName}@${f.installedVersion}`);
      lines.push(`* **Severity:** **${f.severityLevel.toUpperCase()}**${scorePart}`);
      lines.push(`* **Summary:** ${f.summary}`);
      lines.push(`* **Remediation Action:** ${f.remediationAction}`);
      lines.push("");
    }
  }

  if (jsonData.remediationPriorities.length > 0) {
    lines.push("## Remediation Priorities");
    lines.push("");
    lines.push(
      "| Package | Current Version | Vulnerabilities | Highest Severity | Recommended Action |",
    );
    lines.push("| --- | --- | --- | --- | --- |");
    for (const p of jsonData.remediationPriorities) {
      lines.push(
        `| ${p.packageName} | ${p.currentVersion} | ${p.vulnerabilityCount} | **${p.highestSeverity.toUpperCase()}** | ${p.recommendedAction} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
