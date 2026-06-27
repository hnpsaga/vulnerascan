import fs from "fs";
import path from "path";
import { WorkspaceApiService } from "../workspace/workspace-api-service.js";
import {
  DashboardSummary,
  ProjectSummary,
  ScanSummary,
  VulnerabilitySummary,
  EcosystemSummary,
  HistoricalScanSummary,
} from "../models/dashboard.js";
import { ProjectRegistryEntry } from "../workspace/models/project-registry.js";
import {
  VulnerabilityDetectionResult,
  VulnerabilityFinding,
} from "../vulnerability/vulnerability-models.js";
import { homedir } from "os";

export interface DashboardFilter {
  project?: string; // project ID
  ecosystem?: string;
  severity?: string; // 'critical' | 'high' | 'medium' | 'low' | 'unknown'
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export class DashboardService {
  private apiService: WorkspaceApiService;
  public workspacesBaseDir: string;

  constructor(baseDir?: string) {
    this.apiService = new WorkspaceApiService(baseDir);
    if (baseDir) {
      this.workspacesBaseDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      this.workspacesBaseDir = path.join(home, ".vulnerascan", "workspaces");
    }
  }

  /**
   * Helper to normalize severities into categories.
   */
  private parseSeverities(findings: VulnerabilityFinding[]): VulnerabilitySummary {
    const summary: VulnerabilitySummary = {
      total: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    for (const f of findings) {
      const scoreObj =
        f.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || f.severity?.[0];
      const scoreStr = scoreObj?.score;
      let severityCategory = "unknown";

      if (scoreStr) {
        const score = parseFloat(scoreStr);
        if (!isNaN(score)) {
          if (score >= 9.0) severityCategory = "critical";
          else if (score >= 7.0) severityCategory = "high";
          else if (score >= 4.0) severityCategory = "medium";
          else if (score >= 0.1) severityCategory = "low";
          else severityCategory = "unknown";
        } else {
          // Try text match if not a float score
          const lower = scoreStr.toLowerCase();
          if (lower.includes("critical")) severityCategory = "critical";
          else if (lower.includes("high")) severityCategory = "high";
          else if (lower.includes("medium")) severityCategory = "medium";
          else if (lower.includes("low")) severityCategory = "low";
        }
      }

      if (severityCategory === "critical") summary.critical++;
      else if (severityCategory === "high") summary.high++;
      else if (severityCategory === "medium") summary.medium++;
      else if (severityCategory === "low") summary.low++;
      else summary.unknown++;
    }

    return summary;
  }

  /**
   * Retrieve vulnerability findings for a specific project run.
   */
  async getFindingsForRun(workspaceId: string, runId: string): Promise<VulnerabilityFinding[]> {
    const runVulnerabilitiesPath = path.join(
      this.workspacesBaseDir,
      workspaceId,
      "runs",
      runId,
      "vulnerabilities.json",
    );
    try {
      if (fs.existsSync(runVulnerabilitiesPath)) {
        const content = await fs.promises.readFile(runVulnerabilitiesPath, "utf8");
        const detectionResult = JSON.parse(content) as VulnerabilityDetectionResult;
        return detectionResult.findings || [];
      }
    } catch {
      // Ignore errors
    }
    return [];
  }

  /**
   * Check if a date string is within the start and end dates of a filter.
   */
  private matchesDateFilter(timestamp: string, filter?: DashboardFilter): boolean {
    if (!filter) return true;
    const time = new Date(timestamp).getTime();
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      if (time < start) return false;
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      if (time > end) return false;
    }
    return true;
  }

  /**
   * Build project summary.
   */
  async getProjectSummary(
    project: ProjectRegistryEntry,
    filter?: DashboardFilter,
  ): Promise<ProjectSummary> {
    const latestRun = await this.apiService.getLatestScan(project.workspaceId);
    let latestScan: ScanSummary | undefined;
    let vulnerabilities: VulnerabilitySummary = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    if (latestRun) {
      let findings = await this.getFindingsForRun(project.workspaceId, latestRun.runId);

      // Filter findings if severity filter is specified
      if (filter?.severity) {
        const targetSeverity = filter.severity.toLowerCase();
        findings = findings.filter((f) => {
          const scoreObj =
            f.severity?.find((s) => s.type.toLowerCase() === "cvss_v3") || f.severity?.[0];
          const scoreStr = scoreObj?.score;
          let severityCategory = "unknown";
          if (scoreStr) {
            const score = parseFloat(scoreStr);
            if (!isNaN(score)) {
              if (score >= 9.0) severityCategory = "critical";
              else if (score >= 7.0) severityCategory = "high";
              else if (score >= 4.0) severityCategory = "medium";
              else if (score >= 0.1) severityCategory = "low";
            } else {
              const lower = scoreStr.toLowerCase();
              if (lower.includes("critical")) severityCategory = "critical";
              else if (lower.includes("high")) severityCategory = "high";
              else if (lower.includes("medium")) severityCategory = "medium";
              else if (lower.includes("low")) severityCategory = "low";
            }
          }
          return severityCategory === targetSeverity;
        });
      }

      vulnerabilities = this.parseSeverities(findings);

      const metadata = await this.apiService.getWorkspaceMetadata(project.workspaceId);
      const successfulRunDetails =
        metadata?.latestSuccessfulScan?.runId === latestRun.runId
          ? metadata.latestSuccessfulScan
          : undefined;

      latestScan = {
        runId: latestRun.runId,
        timestamp: latestRun.timestamp,
        status: latestRun.status,
        directDependencies:
          successfulRunDetails?.stats?.directDependencies ||
          metadata?.stats?.directDependencies ||
          0,
        totalDependencies:
          successfulRunDetails?.stats?.totalDependencies || metadata?.stats?.totalDependencies || 0,
        vulnerabilitiesCount: latestRun.status === "completed" ? findings.length : 0,
        durationMs: latestRun.durationMs,
        error:
          metadata?.latestFailedScan?.runId === latestRun.runId
            ? metadata.latestFailedScan.error
            : undefined,
      };
    }

    return {
      id: project.id,
      name: project.name,
      path: project.path,
      ecosystems: project.ecosystems,
      firstDiscoveredAt: project.firstDiscoveredAt,
      lastScannedAt: project.lastScannedAt,
      status: project.status,
      workspaceId: project.workspaceId,
      latestScan,
      vulnerabilities,
    };
  }

  /**
   * Get all project summaries matching filters.
   */
  async getProjectSummaries(filter?: DashboardFilter): Promise<ProjectSummary[]> {
    const projects = await this.apiService.listProjects();
    const summaries: ProjectSummary[] = [];

    for (const project of projects) {
      // Filter by project ID
      if (filter?.project && project.id !== filter.project) {
        continue;
      }
      // Filter by ecosystem
      if (filter?.ecosystem && !project.ecosystems.includes(filter.ecosystem)) {
        continue;
      }
      // Filter by scan date
      if (filter && !this.matchesDateFilter(project.lastScannedAt, filter)) {
        continue;
      }

      const summary = await this.getProjectSummary(project, filter);
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Get dashboard summary dashboard-wide.
   */
  async getDashboardSummary(filter?: DashboardFilter): Promise<DashboardSummary> {
    const projectSummaries = await this.getProjectSummaries(filter);

    let totalScans = 0;
    let totalDependencies = 0;
    let totalVulnerabilities = 0;
    let latestScanTimestamp: string | undefined;

    const vulnerabilitySummary: VulnerabilitySummary = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    const ecosystemMap = new Map<string, { projectCount: number; vulnerabilityCount: number }>();

    for (const p of projectSummaries) {
      // Accumulate vulnerabilities
      vulnerabilitySummary.total += p.vulnerabilities.total;
      vulnerabilitySummary.critical += p.vulnerabilities.critical;
      vulnerabilitySummary.high += p.vulnerabilities.high;
      vulnerabilitySummary.medium += p.vulnerabilities.medium;
      vulnerabilitySummary.low += p.vulnerabilities.low;
      vulnerabilitySummary.unknown += p.vulnerabilities.unknown;

      totalVulnerabilities += p.vulnerabilities.total;

      // Scan history counts
      const history = await this.apiService.getScanHistory(p.workspaceId);
      const filteredHistory = history.filter((run) =>
        this.matchesDateFilter(run.timestamp, filter),
      );
      totalScans += filteredHistory.length;

      if (p.latestScan) {
        totalDependencies += p.latestScan.totalDependencies;
        if (!latestScanTimestamp || p.latestScan.timestamp > latestScanTimestamp) {
          latestScanTimestamp = p.latestScan.timestamp;
        }
      }

      for (const eco of p.ecosystems) {
        const current = ecosystemMap.get(eco) || { projectCount: 0, vulnerabilityCount: 0 };
        current.projectCount++;
        current.vulnerabilityCount += p.vulnerabilities.total;
        ecosystemMap.set(eco, current);
      }
    }

    const ecosystems: EcosystemSummary[] = Array.from(ecosystemMap.entries()).map(
      ([ecosystem, data]) => ({
        ecosystem,
        projectCount: data.projectCount,
        vulnerabilityCount: data.vulnerabilityCount,
      }),
    );

    return {
      statistics: {
        totalProjects: projectSummaries.length,
        totalScans,
        totalDependencies,
        totalVulnerabilities,
        latestScanTimestamp,
      },
      vulnerabilities: vulnerabilitySummary,
      ecosystems,
      projects: projectSummaries,
    };
  }

  /**
   * Get chronological scan timeline / history of all projects or filtered projects.
   */
  async getScanTimeline(filter?: DashboardFilter): Promise<HistoricalScanSummary[]> {
    const projects = await this.apiService.listProjects();
    const timeline: HistoricalScanSummary[] = [];

    for (const project of projects) {
      if (filter?.project && project.id !== filter.project) {
        continue;
      }
      if (filter?.ecosystem && !project.ecosystems.includes(filter.ecosystem)) {
        continue;
      }

      const runs = await this.apiService.getScanHistory(project.workspaceId);
      const metadata = await this.apiService.getWorkspaceMetadata(project.workspaceId);

      for (const run of runs) {
        if (!this.matchesDateFilter(run.timestamp, filter)) {
          continue;
        }

        const isLatestSuccess = metadata?.latestSuccessfulScan?.runId === run.runId;
        const findings = await this.getFindingsForRun(project.workspaceId, run.runId);

        timeline.push({
          runId: run.runId,
          timestamp: run.timestamp,
          status: run.status,
          directDependencies: isLatestSuccess
            ? metadata?.latestSuccessfulScan?.stats?.directDependencies || 0
            : 0,
          totalDependencies: isLatestSuccess
            ? metadata?.latestSuccessfulScan?.stats?.totalDependencies || 0
            : 0,
          vulnerabilitiesCount: run.status === "completed" ? findings.length : 0,
          ecosystem: run.ecosystem || project.ecosystems[0],
          projectName: project.name,
        });
      }
    }

    // Sort chronologically (latest first or earliest first. Standard timeline: latest scans first)
    return timeline.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}
