import { Command } from "commander";
import { ProjectDiscoveryService } from "../discovery/project-discovery.js";
import { getProjectTypeDisplayName } from "../models/project-type.js";

export const scanCommand = new Command("scan")
  .description("Scan a project for vulnerabilities")
  .action(async () => {
    try {
      const directory = process.cwd();
      const discovery = new ProjectDiscoveryService();
      const project = await discovery.discover(directory);

      if (!project) {
        console.log("No supported project type detected.");
        process.exitCode = 1;
        return;
      }

      console.log(`Project Type: ${getProjectTypeDisplayName(project.type)}`);
      console.log(`Manifest: ${project.manifest}`);
    } catch (error) {
      console.error("Scan failed:", error);
      process.exitCode = 1;
    }
  });
