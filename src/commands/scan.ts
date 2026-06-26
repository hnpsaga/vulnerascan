import { Command } from "commander";
import { ProjectDiscoveryService } from "../discovery/project-discovery.js";
import { getProjectTypeDisplayName, ProjectType } from "../models/project-type.js";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { RunManager } from "../workspace/run-manager.js";
import { DependencyResolutionService } from "../resolution/dependency-resolution-service.js";
import { formatDisplayDate } from "../utils/date.js";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import { loadConfig } from "../provider/config/config.js";
import { FilesystemVulnerabilityCache } from "../provider/cache/filesystem-cache.js";
import { OsvClient } from "../osv/index.js";
import { VulnerabilityDetector } from "../vulnerability/detector.js";

interface ScanOptions {
  name?: string;
}

export const scanCommand = new Command("scan")
  .description("Scan a project for vulnerabilities")
  .option("-n, --name <name>", "Name of the scan run")
  .action(async (options: ScanOptions) => {
    try {
      const directory = process.cwd();
      const discovery = new ProjectDiscoveryService();
      const project = await discovery.discover(directory);

      if (!project) {
        console.error("No supported project type detected.");
        process.exitCode = 1;
        return;
      }

      console.log(`Project Type: ${getProjectTypeDisplayName(project.type)}`);
      console.log(`Manifest: ${project.manifest}`);

      // Resolve / create workspace
      const workspaceManager = new WorkspaceManager();
      const workspace = await workspaceManager.findOrCreateWorkspace(directory, project.type);

      // Create new scan run
      const runManager = new RunManager();
      const run = await runManager.createRun(workspace.id, project, { name: options.name });

      // Output workspace and run details
      console.log();
      console.log(`Workspace: ${workspace.name}`);
      const runDisplay = run.name ? run.name : formatDisplayDate(new Date(run.timestamp));
      console.log(`Run: ${runDisplay}`);

      // Run dependency resolution (currently Node.js only)
      if (project.type === ProjectType.Node) {
        const resolutionService = new DependencyResolutionService();
        const resolution = await resolutionService.resolve(workspace, run);

        if (resolution.status === "failed") {
          console.error("Dependency resolution failed.");
          process.exitCode = 1;
          return;
        }

        // Output resolution details
        console.log();
        console.log(`Resolution Source: ${resolution.resolutionSource}`);
        console.log();
        console.log(`Direct Dependencies: ${resolution.directDependencies}`);
        console.log(`Total Dependencies: ${resolution.totalDependencies}`);

        // Run Provider Layer
        if (resolution.graph) {
          const home = process.env.VULNERASCAN_HOME || homedir();
          const workspacesBaseDir = path.join(home, ".vulnerascan", "workspaces");
          const runDir = path.join(workspacesBaseDir, workspace.id, "runs", run.id);

          const config = loadConfig();

          let cache: FilesystemVulnerabilityCache | undefined = undefined;
          if (config.cache.enabled) {
            const globalCacheDir = path.join(home, ".vulnerascan", "cache", "osv");
            cache = new FilesystemVulnerabilityCache(globalCacheDir, config.cache.ttlHours);
          }

          const osvClient = new OsvClient({ cache });

          const coordinates = (resolution.graph.nodes || [])
            .filter((node) => node.parents.length > 0)
            .map((node) => ({
              ecosystem: node.ecosystem,
              packageName: node.name,
              version: node.version,
            }));

          console.log();
          console.log("Querying OSV for vulnerabilities...");
          const response = await osvClient.queryPackages(coordinates);

          console.log(`Vulnerabilities found: ${response.vulnerabilities.length}`);

          // Orchestrate vulnerability detection pipeline
          console.log("Running vulnerability detection...");

          const detector = new VulnerabilityDetector({ osvClient });
          const detectionResult = await detector.detect(resolution.graph);

          // Write vulnerabilities.json to run directory
          const runVulnerabilitiesPath = path.join(runDir, "vulnerabilities.json");
          await fs.promises.writeFile(
            runVulnerabilitiesPath,
            JSON.stringify(detectionResult, null, 2),
            "utf8",
          );

          // Write vulnerabilities.json to user's project working directory
          const projectVulnerabilitiesPath = path.join(directory, "vulnerabilities.json");
          await fs.promises.writeFile(
            projectVulnerabilitiesPath,
            JSON.stringify(detectionResult, null, 2),
            "utf8",
          );

          console.log(`Findings generated: ${detectionResult.findings.length}`);

          // Reporting Engine execution
          const { Reporter } = await import("../reporting/index.js");
          const reporter = new Reporter({
            projectDirectory: directory,
            runDirectory: runDir,
          });
          const exitCode = await reporter.report(detectionResult);
          process.exitCode = exitCode;
        }
      } else {
        console.log();
        console.log(
          `Dependency resolution and vulnerability scanning are not yet supported for ${getProjectTypeDisplayName(
            project.type,
          )} projects.`,
        );
        console.log(
          "Currently, only Node.js/npm projects are supported for full dependency analysis.",
        );
        process.exitCode = 0;
      }
    } catch (error) {
      console.error("Scan failed:", error);
      process.exitCode = 2; // Operational failure (exit code > 1)
    }
  });
