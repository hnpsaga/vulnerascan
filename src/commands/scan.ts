import { Command } from "commander";
import { getProjectTypeDisplayName, ProjectType } from "../models/project-type.js";
import { formatDisplayDate } from "../utils/date.js";
import { ScanPipeline } from "./scan-pipeline.js";
import fs from "fs";
import path from "path";

interface ScanOptions {
  name?: string;
  path?: string;
  output?: string;
}

export const scanCommand = new Command("scan")
  .description("Scan a project for vulnerabilities")
  .option("-n, --name <name>", "Name of the scan run")
  .option(
    "-p, --path <path>",
    "Path to the project directory to scan (default: current working directory)",
  )
  .option(
    "-o, --output <dir>",
    "Directory to write generated reports into (Markdown, JSON, CSV). If omitted, reports are only kept in the workspace.",
  )
  .action(async (options: ScanOptions) => {
    try {
      const targetPath = options.path ? path.resolve(options.path) : process.cwd();

      // Ensure target directory exists and is a directory
      if (!fs.existsSync(targetPath)) {
        console.error(`Error: Scanned path does not exist: ${targetPath}`);
        process.exitCode = 1;
        return;
      }
      if (!fs.statSync(targetPath).isDirectory()) {
        console.error(`Error: Scanned path is not a directory: ${targetPath}`);
        process.exitCode = 1;
        return;
      }

      let outputPath: string | undefined = undefined;
      if (options.output) {
        outputPath = path.resolve(options.output);
      }

      const pipeline = new ScanPipeline();
      const exitCode = await pipeline.execute({
        directory: targetPath,
        runName: options.name,
        outputPath,
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
