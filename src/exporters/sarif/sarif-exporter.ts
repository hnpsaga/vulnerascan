import { VulnerabilityDetectionResult } from "../../vulnerability/vulnerability-models.js";

export interface SarifRule {
  id: string;
  shortDescription: {
    text: string;
  };
  fullDescription?: {
    text: string;
  };
  help?: {
    text: string;
    markdown: string;
  };
  helpUri?: string;
  properties?: {
    securitySeverity?: string;
    tags?: string[];
  };
}

export interface SarifResult {
  ruleId: string;
  message: {
    text: string;
  };
  level: "error" | "warning" | "note" | "none";
  locations?: Array<{
    physicalLocation: {
      artifactLocation: {
        uri: string;
      };
    };
  }>;
}

export interface SarifOutput {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

function mapSeverityToSarifLevel(scoreStr?: string): "error" | "warning" | "note" | "none" {
  if (!scoreStr) return "warning";
  const score = parseFloat(scoreStr);
  if (!isNaN(score)) {
    if (score >= 7.0) return "error";
    if (score >= 4.0) return "warning";
    return "note";
  }
  const lower = scoreStr.toLowerCase();
  if (lower.includes("critical") || lower.includes("high")) return "error";
  if (lower.includes("medium")) return "warning";
  if (lower.includes("low")) return "note";
  return "warning";
}

function getSecuritySeverity(scoreStr?: string): string | undefined {
  if (!scoreStr) return undefined;
  const score = parseFloat(scoreStr);
  if (!isNaN(score)) {
    return score.toFixed(1);
  }
  const lower = scoreStr.toLowerCase();
  if (lower.includes("critical")) return "9.5";
  if (lower.includes("high")) return "8.0";
  if (lower.includes("medium")) return "5.5";
  if (lower.includes("low")) return "2.0";
  return undefined;
}

export function exportToSarif(result: VulnerabilityDetectionResult): SarifOutput {
  const rulesMap = new Map<string, SarifRule>();
  const resultsList: SarifResult[] = [];

  for (const finding of result.findings) {
    const ruleId = finding.advisoryId;
    const scoreObj =
      finding.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || finding.severity?.[0];
    const scoreStr = scoreObj?.score;
    const level = mapSeverityToSarifLevel(scoreStr);
    const securitySeverity = getSecuritySeverity(scoreStr);

    if (!rulesMap.has(ruleId)) {
      const tags = ["security", "vulnerability", finding.ecosystem.toLowerCase()];
      if (finding.aliases) {
        tags.push(...finding.aliases.map((a) => a.toLowerCase()));
      }
      const helpUrl =
        finding.references?.[0]?.url || `https://osv.dev/vulnerability/${finding.advisoryId}`;

      rulesMap.set(ruleId, {
        id: ruleId,
        shortDescription: {
          text: finding.summary || `${finding.packageName} has vulnerability ${ruleId}`,
        },
        fullDescription: finding.details ? { text: finding.details } : undefined,
        helpUri: helpUrl,
        help: {
          text: `Vulnerability in ${finding.packageName} (${finding.ecosystem})\n\nInstalled Version: ${finding.installedVersion}\nAdvisory: ${ruleId}\n\n${finding.details || ""}`,
          markdown: `### Vulnerability in \`${finding.packageName}\` (${finding.ecosystem})\n\n* **Installed Version:** ${finding.installedVersion}\n* **Advisory:** [${ruleId}](${helpUrl})\n\n${finding.details || finding.summary || ""}`,
        },
        properties: {
          securitySeverity,
          tags,
        },
      });
    }

    resultsList.push({
      ruleId,
      message: {
        text: `Package ${finding.packageName}@${finding.installedVersion} is vulnerable to ${ruleId}. Summary: ${finding.summary}`,
      },
      level,
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: finding.packageName,
            },
          },
        },
      ],
    });
  }

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "VulneraScan",
            version: "0.0.3",
            rules: Array.from(rulesMap.values()),
          },
        },
        results: resultsList,
      },
    ],
  };
}
