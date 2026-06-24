import { Command } from "commander";
import { ProjectDiscoveryService } from "../discovery/project-discovery.js";
import { getProjectTypeDisplayName, ProjectType } from "../models/project-type.js";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { RunManager } from "../workspace/run-manager.js";
import { DependencyResolutionService } from "../resolution/dependency-resolution-service.js";
import { formatDisplayDate } from "../utils/date.js";

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
      }
    } catch (error) {
      console.error("Scan failed:", error);
      process.exitCode = 1;
    }
  });
