import { describe, it, expect } from "vitest";
import { exportToSarif } from "../src/exporters/sarif/sarif-exporter.js";
import { exportToCycloneDx } from "../src/exporters/cyclonedx/cyclonedx-exporter.js";
import { exportToSpdx } from "../src/exporters/spdx/spdx-exporter.js";
import { generateLlmContextJson, generateLlmContextMd } from "../src/exporters/llm/llm-exporter.js";
import { VulnerabilityDetectionResult } from "../src/vulnerability/vulnerability-models.js";
import { DependencyGraph } from "../src/resolution/models/dependency-graph.js";

const mockResult: VulnerabilityDetectionResult = {
  schemaVersion: 1,
  timestamp: "2026-06-27T00:00:00.000Z",
  totalPackagesScanned: 10,
  vulnerablePackages: 2,
  findings: [
    {
      findingId: "GHSA-1234-5678-npm-express",
      advisoryId: "GHSA-1234-5678",
      packageName: "express",
      ecosystem: "npm",
      installedVersion: "4.17.1",
      summary: "Prototype pollution in express",
      details: "More detailed details here.",
      severity: [{ type: "CVSS_V3", score: "9.8" }],
      aliases: ["CVE-2026-9999"],
      references: [
        {
          source: "GitHub",
          identifier: "GHSA-1234-5678",
          url: "https://github.com/advisories/GHSA-1234-5678",
        },
      ],
      isDirect: true,
      isTransitive: false,
    },
    {
      findingId: "GHSA-8765-4321-npm-lodash",
      advisoryId: "GHSA-8765-4321",
      packageName: "lodash",
      ecosystem: "npm",
      installedVersion: "4.17.20",
      summary: "Regular expression denial of service",
      severity: [{ type: "CVSS_V3", score: "7.5" }],
      aliases: [],
      references: [],
      isDirect: false,
      isTransitive: true,
    },
  ],
};

const mockGraph: DependencyGraph = {
  schemaVersion: 1,
  projectType: "node",
  packageManager: "npm",
  nodes: [
    {
      id: "npm:root@1.0.0",
      name: "root",
      version: "1.0.0",
      ecosystem: "npm",
      dependencyType: "production",
      isDirect: false,
      isTransitive: false,
      parents: [],
      children: ["npm:express@4.17.1", "npm:lodash@4.17.20"],
      depth: 0,
    },
    {
      id: "npm:express@4.17.1",
      name: "express",
      version: "4.17.1",
      ecosystem: "npm",
      dependencyType: "production",
      isDirect: true,
      isTransitive: false,
      parents: ["npm:root@1.0.0"],
      children: [],
      depth: 1,
    },
    {
      id: "npm:lodash@4.17.20",
      name: "lodash",
      version: "4.17.20",
      ecosystem: "npm",
      dependencyType: "production",
      isDirect: false,
      isTransitive: true,
      parents: ["npm:root@1.0.0"],
      children: [],
      depth: 1,
    },
  ],
  edges: [
    { source: "npm:root@1.0.0", target: "npm:express@4.17.1" },
    { source: "npm:root@1.0.0", target: "npm:lodash@4.17.20" },
  ],
};

describe("Security and AI Context Exporters", () => {
  it("generates valid SARIF export data", () => {
    const sarif = exportToSarif(mockResult);
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs.length).toBe(1);
    expect(sarif.runs[0].tool.driver.name).toBe("VulneraScan");
    expect(sarif.runs[0].results.length).toBe(2);

    const firstResult = sarif.runs[0].results[0];
    expect(firstResult.ruleId).toBe("GHSA-1234-5678");
    expect(firstResult.level).toBe("error"); // 9.8 score is mapped to error
  });

  it("generates valid CycloneDX export data with dependency graph", () => {
    const bom = exportToCycloneDx(mockResult, mockGraph);
    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.specVersion).toBe("1.5");
    expect(bom.components.length).toBe(2); // express and lodash (root node filtered out)
    expect(bom.components[0].name).toBe("express");
    expect(bom.vulnerabilities?.length).toBe(2);
    expect(bom.vulnerabilities?.[0].id).toBe("GHSA-1234-5678");
    expect(bom.vulnerabilities?.[0].ratings?.[0].severity).toBe("critical");
  });

  it("generates valid SPDX export data", () => {
    const spdx = exportToSpdx(mockResult, mockGraph, "test-proj");
    expect(spdx.spdxVersion).toBe("SPDX-2.3");
    expect(spdx.name).toBe("test-proj");
    expect(spdx.packages.length).toBe(3); // root + express + lodash
    expect(spdx.relationships.length).toBe(2);
  });

  it("generates valid AI context data", () => {
    const llmJson = generateLlmContextJson(mockResult, mockGraph, "test-proj");
    expect(llmJson.project.name).toBe("test-proj");
    expect(llmJson.summary.totalVulnerabilities).toBe(2);
    expect(llmJson.summary.severityCounts.critical).toBe(1);
    expect(llmJson.summary.severityCounts.high).toBe(1);

    const md = generateLlmContextMd(llmJson);
    expect(md).toContain("# AI Security Context: test-proj");
    expect(md).toContain("Prototype pollution in express");
  });
});
