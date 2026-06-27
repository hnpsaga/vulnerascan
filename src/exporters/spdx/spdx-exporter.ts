import { DependencyGraph } from "../../resolution/models/dependency-graph.js";
import { VulnerabilityDetectionResult } from "../../vulnerability/vulnerability-models.js";

export interface SpdxOutput {
  spdxVersion: string;
  dataLicense: string;
  SPDXID: string;
  name: string;
  documentNamespace: string;
  creationInfo: {
    creators: string[];
    created: string;
  };
  packages: Array<{
    name: string;
    SPDXID: string;
    versionInfo: string;
    downloadLocation: string;
    filesAnalyzed: boolean;
    licenseConcluded: string;
    licenseDeclared: string;
    externalRefs?: Array<{
      referenceCategory: string;
      referenceType: string;
      locator: string;
    }>;
  }>;
  relationships: Array<{
    spdxElementId: string;
    relationshipType: string;
    relatedSpdxElement: string;
  }>;
}

function sanitizeSpdxId(name: string, version: string): string {
  const clean = `${name}-${version}`.replace(/[^a-zA-Z0-9.-]/g, "-");
  return `SPDXRef-Package-${clean}`;
}

export function exportToSpdx(
  result: VulnerabilityDetectionResult,
  graph?: DependencyGraph,
  projectName?: string,
): SpdxOutput {
  const docName = projectName || "VulneraScan-Document";
  const docNamespace = `https://vulnerascan.dev/spdx/${docName}-${Date.now()}`;
  const timestamp = result.timestamp || new Date().toISOString();

  const packages: SpdxOutput["packages"] = [];
  const relationships: SpdxOutput["relationships"] = [];
  const seenIds = new Set<string>();

  // Add Document root package if we have name
  const rootSpdxId = "SPDXRef-RootPackage";
  packages.push({
    name: docName,
    SPDXID: rootSpdxId,
    versionInfo: "0.0.0",
    downloadLocation: "NOASSERTION",
    filesAnalyzed: false,
    licenseConcluded: "NOASSERTION",
    licenseDeclared: "NOASSERTION",
  });

  if (graph && graph.nodes) {
    for (const node of graph.nodes) {
      if (node.depth === 0) continue;
      const spdxId = sanitizeSpdxId(node.name, node.version);

      if (!seenIds.has(spdxId)) {
        seenIds.add(spdxId);

        // Map vulnerabilities affecting this node
        const relatedFindings = result.findings.filter(
          (f) =>
            f.packageName.toLowerCase() === node.name.toLowerCase() &&
            f.installedVersion === node.version &&
            f.ecosystem.toLowerCase() === node.ecosystem.toLowerCase(),
        );

        const externalRefs = relatedFindings.map((f) => ({
          referenceCategory: "SECURITY",
          referenceType: "advisory",
          locator: f.references?.[0]?.url || `https://osv.dev/vulnerability/${f.advisoryId}`,
        }));

        packages.push({
          name: node.name,
          SPDXID: spdxId,
          versionInfo: node.version,
          downloadLocation: "NOASSERTION",
          filesAnalyzed: false,
          licenseConcluded: "NOASSERTION",
          licenseDeclared: "NOASSERTION",
          externalRefs: externalRefs.length > 0 ? externalRefs : undefined,
        });

        // Add relationship to root if depth 1 (direct)
        if (node.depth === 1) {
          relationships.push({
            spdxElementId: rootSpdxId,
            relationshipType: "DEPENDS_ON",
            relatedSpdxElement: spdxId,
          });
        }
      }
    }

    for (const node of graph.nodes) {
      if (node.depth === 0) continue;
      const spdxId = sanitizeSpdxId(node.name, node.version);

      for (const childId of node.children || []) {
        const childNode = graph.nodes.find((n) => n.id === childId);
        if (childNode) {
          const childSpdxId = sanitizeSpdxId(childNode.name, childNode.version);
          relationships.push({
            spdxElementId: spdxId,
            relationshipType: "DEPENDS_ON",
            relatedSpdxElement: childSpdxId,
          });
        }
      }
    }
  } else {
    // Fallback: build from findings
    for (const finding of result.findings) {
      const spdxId = sanitizeSpdxId(finding.packageName, finding.installedVersion);
      if (!seenIds.has(spdxId)) {
        seenIds.add(spdxId);

        packages.push({
          name: finding.packageName,
          SPDXID: spdxId,
          versionInfo: finding.installedVersion,
          downloadLocation: "NOASSERTION",
          filesAnalyzed: false,
          licenseConcluded: "NOASSERTION",
          licenseDeclared: "NOASSERTION",
          externalRefs: [
            {
              referenceCategory: "SECURITY",
              referenceType: "advisory",
              locator:
                finding.references?.[0]?.url ||
                `https://osv.dev/vulnerability/${finding.advisoryId}`,
            },
          ],
        });

        relationships.push({
          spdxElementId: rootSpdxId,
          relationshipType: "DEPENDS_ON",
          relatedSpdxElement: spdxId,
        });
      }
    }
  }

  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: docName,
    documentNamespace: docNamespace,
    creationInfo: {
      creators: ["Tool: VulneraScan-0.0.3"],
      created: timestamp,
    },
    packages,
    relationships,
  };
}
