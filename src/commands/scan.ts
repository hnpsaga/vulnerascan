import { Command } from "commander";
import { ProjectDiscoveryService } from "../discovery/project-discovery.js";
import { getProjectTypeDisplayName } from "../models/project-type.js";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { RunManager } from "../workspace/run-manager.js";
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
    } catch (error) {
      console.error("Scan failed:", error);
      process.exitCode = 1;
    }
  });
