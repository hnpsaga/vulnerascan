import { Command } from "commander";
import { DashboardService } from "../workspace/dashboard-service.js";

interface DashboardSummaryOptions {
  ecosystem?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

interface DashboardProjectsOptions {
  ecosystem?: string;
  severity?: string;
}

export const dashboardCommand = new Command("dashboard").description(
  "Dashboard backend commands for querying scan reports and project summaries.",
);

dashboardCommand
  .command("summary")
  .description("Output a structured terminal summary of the overall workspace dashboard.")
  .option("-e, --ecosystem <ecosystem>", "Filter by ecosystem")
  .option("-s, --severity <severity>", "Filter by severity (critical, high, medium, low, unknown)")
  .option("--start-date <date>", "Filter by start date (ISO format)")
  .option("--end-date <date>", "Filter by end date (ISO format)")
  .action(async (opts: Record<string, string | undefined>) => {
    try {
      const options: DashboardSummaryOptions = opts;
      const service = new DashboardService();
      const summary = await service.getDashboardSummary({
        ecosystem: options.ecosystem,
        severity: options.severity,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      console.log("=== VULNERASCAN DASHBOARD SUMMARY ===");
      console.log(`Total Projects:       ${summary.statistics.totalProjects}`);
      console.log(`Total Scans:          ${summary.statistics.totalScans}`);
      console.log(`Total Dependencies:   ${summary.statistics.totalDependencies}`);
      console.log(`Total Vulnerabilities: ${summary.statistics.totalVulnerabilities}`);
      if (summary.statistics.latestScanTimestamp) {
        console.log(`Latest Scan:          ${summary.statistics.latestScanTimestamp}`);
      }
      console.log("-------------------------------------");
      console.log("Vulnerability Severities:");
      console.log(`  Critical: ${summary.vulnerabilities.critical}`);
      console.log(`  High:     ${summary.vulnerabilities.high}`);
      console.log(`  Medium:   ${summary.vulnerabilities.medium}`);
      console.log(`  Low:      ${summary.vulnerabilities.low}`);
      console.log(`  Unknown:  ${summary.vulnerabilities.unknown}`);
      console.log("-------------------------------------");
      console.log("Ecosystems Breakdown:");
      if (summary.ecosystems.length === 0) {
        console.log("  No ecosystems recorded.");
      } else {
        for (const eco of summary.ecosystems) {
          console.log(
            `  - ${eco.ecosystem}: ${eco.projectCount} project(s), ${eco.vulnerabilityCount} vulnerability/vulnerabilities`,
          );
        }
      }
      console.log("=====================================");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error loading dashboard summary: ${msg}`);
      process.exit(1);
    }
  });

dashboardCommand
  .command("projects")
  .description("List registered projects and their latest summaries.")
  .option("-e, --ecosystem <ecosystem>", "Filter by ecosystem")
  .option("-s, --severity <severity>", "Filter by severity (critical, high, medium, low, unknown)")
  .action(async (opts: Record<string, string | undefined>) => {
    try {
      const options: DashboardProjectsOptions = opts;
      const service = new DashboardService();
      const projects = await service.getProjectSummaries({
        ecosystem: options.ecosystem,
        severity: options.severity,
      });

      console.log("=== VULNERASCAN PROJECTS ===");
      if (projects.length === 0) {
        console.log("No registered projects found.");
      } else {
        for (const p of projects) {
          console.log(`Project ID:   ${p.id}`);
          console.log(`Name:         ${p.name}`);
          console.log(`Path:         ${p.path}`);
          console.log(`Ecosystems:   ${p.ecosystems.join(", ")}`);
          console.log(`Status:       ${p.status}`);
          console.log(`Last Scanned: ${p.lastScannedAt}`);
          console.log(`Vulnerabilities (Total: ${p.vulnerabilities.total}):`);
          console.log(
            `  Critical: ${p.vulnerabilities.critical} | High: ${p.vulnerabilities.high} | Medium: ${p.vulnerabilities.medium} | Low: ${p.vulnerabilities.low} | Unknown: ${p.vulnerabilities.unknown}`,
          );
        }
      }
      console.log("============================");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error listing dashboard projects: ${msg}`);
      process.exit(1);
    }
  });

dashboardCommand
  .description("Start the dashboard UI server and web interface.")
  .option("-p, --port <port>", "Port to run the dashboard server on", "4000")
  .option("-h, --host <host>", "Host to run the dashboard server on", "localhost")
  .action(async (opts: { port: string; host: string }) => {
    try {
      const { DashboardServer } = await import("../workspace/dashboard-server.js");
      const port = parseInt(opts.port, 10);
      const server = new DashboardServer({ port, host: opts.host });
      await server.start();
      console.log(`VulneraScan Dashboard listening at http://${opts.host}:${port}`);

      // Attempt to open the browser automatically
      try {
        const { exec } = await import("child_process");
        const url = `http://${opts.host}:${port}`;
        const startCmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        exec(`${startCmd} ${url}`);
      } catch {
        // Ignore errors if we cannot launch browser
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to start dashboard server: ${msg}`);
      process.exit(1);
    }
  });
