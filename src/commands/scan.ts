import { Command } from "commander";
import { getProjectTypeDisplayName, ProjectType } from "../models/project-type.js";
import { formatDisplayDate } from "../utils/date.js";
import { ScanPipeline } from "./scan-pipeline.js";

interface ScanOptions {
  name?: string;
}

export const scanCommand = new Command("scan")
  .description("Scan a project for vulnerabilities")
  .option("-n, --name <name>", "Name of the scan run")
  .action(async (options: ScanOptions) => {
    try {
      const directory = process.cwd();
      const pipeline = new ScanPipeline();
      const exitCode = await pipeline.execute({
        directory,
        runName: options.name,
        onLog: (msg) => {
          // Replace raw Node display with user-friendly display in cli if logged
          if (msg.startsWith("Project Type: ")) {
            const rawType = msg.replace("Project Type: ", "") as ProjectType;
            console.log(`Project Type: ${getProjectTypeDisplayName(rawType)}`);
          } else if (msg.startsWith("Run: ") && !options.name) {
            // Keep date formatting
            console.log(`Run: ${formatDisplayDate(new Date())}`);
          } else {
            console.log(msg);
          }
        },
      });
      process.exitCode = exitCode;
    } catch (error) {
      console.error("Scan failed:", error);
      process.exitCode = 2; // Operational failure (exit code > 1)
    }
  });
