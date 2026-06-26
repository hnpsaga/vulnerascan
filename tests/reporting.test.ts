import { describe, it, expect, vi } from "vitest";
import { calculateSummary } from "../src/reporting/summary.js";
import { TerminalReporter } from "../src/reporting/terminal-reporter.js";
import { MarkdownReporter } from "../src/reporting/markdown-reporter.js";
import { CsvReporter } from "../src/reporting/csv-reporter.js";
import { VulnerabilityDetectionResult } from "../src/vulnerability/vulnerability-models.js";

const mockResult: VulnerabilityDetectionResult = {
  schemaVersion: 1,
  timestamp: "2026-06-26T08:00:00.000Z",
  totalPackagesScanned: 10,
  vulnerablePackages: 2,
  findings: [
    {
      findingId: "GHSA-1234-abcd-efgh:pkg-a",
      advisoryId: "GHSA-1234-abcd-efgh",
      packageName: "pkg-a",
      ecosystem: "npm",
      installedVersion: "1.0.0",
      summary: "A vulnerability in pkg-a",
      details: "More details about pkg-a",
      severity: [{ type: "CVSS_V3", score: "9.8" }], // Critical
      aliases: ["CVE-2026-9999"],
      references: [
        {
          source: "GHSA",
          identifier: "GHSA-1234-abcd-efgh",
          url: "https://github.com/advisories/GHSA-1234-abcd-efgh",
        },
      ],
      isDirect: true,
      isTransitive: false,
      dependencyPath: ["root", "pkg-a"],
    },
    {
      findingId: "GHSA-5678-ijkl-mnop:pkg-b",
      advisoryId: "GHSA-5678-ijkl-mnop",
      packageName: "pkg-b",
      ecosystem: "npm",
      installedVersion: "2.0.0",
      summary: "A vulnerability in pkg-b",
      severity: [{ type: "CVSS_V3", score: "6.5" }], // Medium
      aliases: [],
      references: [],
      isDirect: false,
      isTransitive: true,
      dependencyPath: ["root", "pkg-a", "pkg-b"],
    },
  ],
};

const emptyResult: VulnerabilityDetectionResult = {
  schemaVersion: 1,
  timestamp: "2026-06-26T08:00:00.000Z",
  totalPackagesScanned: 5,
  vulnerablePackages: 0,
  findings: [],
};

describe("Reporting Summary Engine", () => {
  it("calculates summary correctly for multiple findings", () => {
    const summary = calculateSummary(mockResult);
    expect(summary.totalFindings).toBe(2);
    expect(summary.criticalCount).toBe(1);
    expect(summary.highCount).toBe(0);
    expect(summary.mediumCount).toBe(1);
    expect(summary.lowCount).toBe(0);
    expect(summary.unknownCount).toBe(0);
    expect(summary.directDependencyCount).toBe(1);
    expect(summary.transitiveDependencyCount).toBe(1);
    expect(summary.vulnerablePackageCount).toBe(2);
    expect(summary.totalPackagesScanned).toBe(10);
  });

  it("calculates summary correctly for empty findings", () => {
    const summary = calculateSummary(emptyResult);
    expect(summary.totalFindings).toBe(0);
    expect(summary.criticalCount).toBe(0);
    expect(summary.highCount).toBe(0);
    expect(summary.mediumCount).toBe(0);
    expect(summary.lowCount).toBe(0);
    expect(summary.unknownCount).toBe(0);
    expect(summary.directDependencyCount).toBe(0);
    expect(summary.transitiveDependencyCount).toBe(0);
    expect(summary.vulnerablePackageCount).toBe(0);
    expect(summary.totalPackagesScanned).toBe(5);
  });
});

describe("Markdown Reporter", () => {
  it("generates markdown for empty scan", () => {
    const summary = calculateSummary(emptyResult);
    const reporter = new MarkdownReporter();
    const markdown = reporter.generate(emptyResult, summary);
    expect(markdown).toContain("# Vulnerability Scan Report");
    expect(markdown).toContain("No vulnerabilities detected.");
  });

  it("generates markdown for multiple findings with severity grouping and package details", () => {
    const summary = calculateSummary(mockResult);
    const reporter = new MarkdownReporter();
    const markdown = reporter.generate(mockResult, summary);
    expect(markdown).toContain("# Vulnerability Scan Report");
    expect(markdown).toContain("### CRITICAL (1)");
    expect(markdown).toContain("### MEDIUM (1)");
    expect(markdown).toContain("#### pkg-a@1.0.0");
    expect(markdown).toContain("- **Advisory ID:** GHSA-1234-abcd-efgh");
    expect(markdown).toContain("#### pkg-b@2.0.0");
  });
});

describe("CSV Reporter", () => {
  it("generates CSV headers only for empty scan", () => {
    const reporter = new CsvReporter();
    const csv = reporter.generate(emptyResult);
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe(
      "Package,Ecosystem,Installed Version,Severity,Advisory ID,Aliases,Direct/Transitive,Dependency Path,Summary,Published Date,Modified Date",
    );
  });

  it("flattens vulnerability findings into CSV format deterministically", () => {
    const reporter = new CsvReporter();
    const csv = reporter.generate(mockResult);
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(3); // Header + 2 findings

    // Check column ordering & escaping
    expect(lines[1]).toContain(
      "pkg-a,npm,1.0.0,CRITICAL,GHSA-1234-abcd-efgh,CVE-2026-9999,Direct,root -> pkg-a",
    );
    expect(lines[2]).toContain(
      "pkg-b,npm,2.0.0,MEDIUM,GHSA-5678-ijkl-mnop,,Transitive,root -> pkg-a -> pkg-b",
    );
  });
});

describe("Terminal Reporter", () => {
  it("renders terminal logs correctly", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // return void
    });
    const summary = calculateSummary(mockResult);
    const reporter = new TerminalReporter();
    reporter.render(mockResult, summary);

    expect(logSpy).toHaveBeenCalled();
    const calls = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
    expect(calls).toContain("SCAN SUMMARY");
    expect(calls).toContain("Packages Scanned: 10");
    expect(calls).toContain("[CRITICAL] pkg-a@1.0.0");
    expect(calls).toContain("[MEDIUM] pkg-b@2.0.0");

    logSpy.mockRestore();
  });
});
