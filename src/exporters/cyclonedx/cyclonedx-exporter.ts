import { VulnerabilityDetectionResult } from "../../vulnerability/vulnerability-models.js";
import { DependencyGraph } from "../../resolution/models/dependency-graph.js";

export interface CycloneDxOutput {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: {
      components: Array<{
        type: string;
        name: string;
        version: string;
      }>;
    };
  };
  components: Array<{
    type: string;
    name: string;
    version: string;
    purl?: string;
    bomRef?: string;
  }>;
  dependencies: Array<{
    ref: string;
    dependsOn?: string[];
  }>;
  vulnerabilities?: Array<{
    id: string;
    source?: {
      name: string;
      url?: string;
    };
    ratings?: Array<{
      score?: number;
      severity?: "low" | "medium" | "high" | "critical" | "info" | "none" | "unknown";
      method?: string;
    }>;
    description?: string;
    detail?: string;
    advisories?: Array<{
      url: string;
    }>;
    affects: Array<{
      ref: string;
    }>;
  }>;
}

function getPurl(ecosystem: string, name: string, version: string): string {
  const ecoLower = ecosystem.toLowerCase();
  let type = ecoLower;
  if (ecoLower === "node" || ecoLower === "npm") {
    type = "npm";
  } else if (ecoLower === "python" || ecoLower === "pypi") {
    type = "pypi";
  } else if (ecoLower === "maven") {
    type = "maven";
  } else if (ecoLower === "go") {
    type = "golang";
  } else if (ecoLower === "rust" || ecoLower === "cargo") {
    type = "cargo";
  } else if (ecoLower === "php" || ecoLower === "packagist") {
    type = "composer";
  } else if (ecoLower === "dotnet" || ecoLower === "nuget") {
    type = "nuget";
  }
  return `pkg:${type}/${name}@${version}`;
}

function mapScoreToCycloneDxSeverity(
  scoreStr?: string,
): "none" | "low" | "medium" | "high" | "critical" | "unknown" {
  if (!scoreStr) return "unknown";
  const score = parseFloat(scoreStr);
  if (!isNaN(score)) {
    if (score >= 9.0) return "critical";
    if (score >= 7.0) return "high";
    if (score >= 4.0) return "medium";
    if (score >= 0.1) return "low";
    return "none";
  }
  const lower = scoreStr.toLowerCase();
  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("medium")) return "medium";
  if (lower.includes("low")) return "low";
  return "unknown";
}

export function exportToCycloneDx(
  result: VulnerabilityDetectionResult,
  graph?: DependencyGraph,
): CycloneDxOutput {
  const components: CycloneDxOutput["components"] = [];
  const dependencies: CycloneDxOutput["dependencies"] = [];
  const uuid =
    "urn:uuid:" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const seenRefs = new Set<string>();

  // If a graph is provided, we map components and dependencies from the canonical dependency graph
  if (graph && graph.nodes) {
    for (const node of graph.nodes) {
      if (node.depth === 0) {
        // Root node
        continue;
      }
      const ref = getPurl(node.ecosystem, node.name, node.version);
      if (!seenRefs.has(ref)) {
        seenRefs.add(ref);
        components.push({
          type: "library",
          name: node.name,
          version: node.version,
          purl: ref,
          bomRef: ref,
        });
      }
    }

    for (const node of graph.nodes) {
      if (node.depth === 0) continue;
      const ref = getPurl(node.ecosystem, node.name, node.version);
      const childRefs = (node.children || [])
        .map((childId) => {
          const childNode = graph.nodes.find((n) => n.id === childId);
          return childNode
            ? getPurl(childNode.ecosystem, childNode.name, childNode.version)
            : undefined;
        })
        .filter((r): r is string => !!r);

      dependencies.push({
        ref,
        dependsOn: childRefs.length > 0 ? childRefs : undefined,
      });
    }
  } else {
    // If no graph is provided, infer components from findings
    for (const finding of result.findings) {
      const ref = getPurl(finding.ecosystem, finding.packageName, finding.installedVersion);
      if (!seenRefs.has(ref)) {
        seenRefs.add(ref);
        components.push({
          type: "library",
          name: finding.packageName,
          version: finding.installedVersion,
          purl: ref,
          bomRef: ref,
        });
      }
    }
  }

  const vulnerabilities: CycloneDxOutput["vulnerabilities"] = [];

  for (const finding of result.findings) {
    const scoreObj =
      finding.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || finding.severity?.[0];
    const scoreStr = scoreObj?.score;
    const severity = mapScoreToCycloneDxSeverity(scoreStr);
    const scoreVal = scoreStr ? parseFloat(scoreStr) : undefined;
    const ref = getPurl(finding.ecosystem, finding.packageName, finding.installedVersion);

    const ratings = [];
    if (scoreVal !== undefined || severity !== "unknown") {
      ratings.push({
        score: isNaN(scoreVal!) ? undefined : scoreVal,
        severity,
        method: scoreObj?.type.toUpperCase() || "CVSSv3",
      });
    }

    const advisories = finding.references?.map((r) => ({ url: r.url })) || [];

    vulnerabilities.push({
      id: finding.advisoryId,
      source: {
        name: finding.advisoryId.startsWith("GHSA") ? "GitHub Security Advisory" : "NVD",
        url: finding.references?.[0]?.url || `https://osv.dev/vulnerability/${finding.advisoryId}`,
      },
      ratings: ratings.length > 0 ? ratings : undefined,
      description: finding.summary,
      detail: finding.details,
      advisories: advisories.length > 0 ? advisories : undefined,
      affects: [
        {
          ref,
        },
      ],
    });
  }

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: uuid,
    version: 1,
    metadata: {
      timestamp: result.timestamp || new Date().toISOString(),
      tools: {
        components: [
          {
            type: "application",
            name: "VulneraScan",
            version: "0.0.3",
          },
        ],
      },
    },
    components,
    dependencies,
    vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
  };
}
