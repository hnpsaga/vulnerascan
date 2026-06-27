import { Command } from "commander";
import fs from "fs";
import path from "path";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { WorkspaceApiService } from "../workspace/workspace-api-service.js";
import {
  exportToSarif,
  exportToCycloneDx,
  exportToSpdx,
  generateLlmContextJson,
  generateLlmContextMd,
} from "../exporters/index.js";
import { VulnerabilityDetectionResult } from "../vulnerability/vulnerability-models.js";
import { ProjectDiscoveryService } from "../discovery/project-discovery.js";
import { DependencyGraph } from "../resolution/models/dependency-graph.js";
import { Workspace } from "../workspace/models/workspace.js";

interface ExportOptions {
  path?: string;
  output?: string;
}

interface LatestRunDetails {
  workspace: Workspace;
  detectionResult: VulnerabilityDetectionResult;
  graph?: DependencyGraph;
}

async function getWorkspaceAndLatestRun(targetPath: string): Promise<LatestRunDetails> {
  const discovery = new ProjectDiscoveryService();
  const project = await discovery.discover(targetPath);
  if (!project) {
    throw new Error("No supported project type detected.");
  }

  const workspaceManager = new WorkspaceManager();
  const workspace = await workspaceManager.findOrCreateWorkspace(targetPath, project.type);

  const apiService = new WorkspaceApiService();
  const runs = await apiService.getScanHistory(workspace.id);
  if (runs.length === 0) {
    throw new Error("No scan runs found for this workspace. Please run `vulnerascan scan` first.");
  }

  // Sort by timestamp descending
  runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latestRun = runs[0];

  const { homedir } = await import("os");
  const home = process.env.VULNERASCAN_HOME || homedir();
  const runDir = path.join(
    home,
    ".vulnerascan",
    "workspaces",
    workspace.id,
    "runs",
    latestRun.runId,
  );
  const vulnerabilitiesJsonPath = path.join(runDir, "vulnerabilities.json");

  if (!fs.existsSync(vulnerabilitiesJsonPath)) {
    throw new Error(
      "No vulnerability detection result found for the latest run. Run a scan first.",
    );
  }

  const detectionResult = JSON.parse(
    fs.readFileSync(vulnerabilitiesJsonPath, "utf8"),
  ) as VulnerabilityDetectionResult;

  // Try to load dependency graph if available
  let graph: DependencyGraph | undefined;
  const graphPath = path.join(runDir, "dependency-graph.json");
  if (fs.existsSync(graphPath)) {
    try {
      graph = JSON.parse(fs.readFileSync(graphPath, "utf8")) as DependencyGraph;
    } catch {
      // Ignore
    }
  }

  return { workspace, detectionResult, graph };
}

export const exportCommand = new Command("export").description(
  "Export scan results into security or AI context formats",
);

exportCommand
  .command("sarif")
  .description("Export vulnerability findings to SARIF format")
  .option("-p, --path <path>", "Path to the project directory (default: current working directory)")
  .option("-o, --output <dir>", "Directory to write the SARIF export file to")
  .action(async (options: ExportOptions) => {
    try {
      const targetPath = options.path ? path.resolve(options.path) : process.cwd();
      const { detectionResult } = await getWorkspaceAndLatestRun(targetPath);

      const sarifData = exportToSarif(detectionResult);
      const outDir = options.output ? path.resolve(options.output) : path.join(process.cwd());

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const outFile = path.join(outDir, "vulnerabilities.sarif");
      fs.writeFileSync(outFile, JSON.stringify(sarifData, null, 2), "utf8");
      console.log(`SARIF export successfully generated at: ${outFile}`);
    } catch (error) {
      console.error("SARIF export failed:", (error as Error).message);
      process.exitCode = 1;
    }
  });

exportCommand
  .command("cyclonedx")
  .description("Export vulnerability findings to CycloneDX BOM format")
  .option("-p, --path <path>", "Path to the project directory (default: current working directory)")
  .option("-o, --output <dir>", "Directory to write the CycloneDX export file to")
  .action(async (options: ExportOptions) => {
    try {
      const targetPath = options.path ? path.resolve(options.path) : process.cwd();
      const { detectionResult, graph } = await getWorkspaceAndLatestRun(targetPath);

      const cycloneDxData = exportToCycloneDx(detectionResult, graph);
      const outDir = options.output ? path.resolve(options.output) : path.join(process.cwd());

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const outFile = path.join(outDir, "bom.json");
      fs.writeFileSync(outFile, JSON.stringify(cycloneDxData, null, 2), "utf8");
      console.log(`CycloneDX export successfully generated at: ${outFile}`);
    } catch (error) {
      console.error("CycloneDX export failed:", (error as Error).message);
      process.exitCode = 1;
    }
  });

exportCommand
  .command("spdx")
  .description("Export dependency metadata to SPDX format")
  .option("-p, --path <path>", "Path to the project directory (default: current working directory)")
  .option("-o, --output <dir>", "Directory to write the SPDX export file to")
  .action(async (options: ExportOptions) => {
    try {
      const targetPath = options.path ? path.resolve(options.path) : process.cwd();
      const { workspace, detectionResult, graph } = await getWorkspaceAndLatestRun(targetPath);

      const spdxData = exportToSpdx(detectionResult, graph, workspace.name);
      const outDir = options.output ? path.resolve(options.output) : path.join(process.cwd());

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const outFile = path.join(outDir, "project.spdx.json");
      fs.writeFileSync(outFile, JSON.stringify(spdxData, null, 2), "utf8");
      console.log(`SPDX export successfully generated at: ${outFile}`);
    } catch (error) {
      console.error("SPDX export failed:", (error as Error).message);
      process.exitCode = 1;
    }
  });

exportCommand
  .command("llm")
  .description("Export project security posture to AI-friendly llm-context format")
  .option("-p, --path <path>", "Path to the project directory (default: current working directory)")
  .option("-o, --output <dir>", "Directory to write the AI context files to")
  .action(async (options: ExportOptions) => {
    try {
      const targetPath = options.path ? path.resolve(options.path) : process.cwd();
      const { workspace, detectionResult, graph } = await getWorkspaceAndLatestRun(targetPath);

      const llmJson = generateLlmContextJson(detectionResult, graph, workspace.name);
      const llmMd = generateLlmContextMd(llmJson);

      const outDir = options.output ? path.resolve(options.output) : path.join(process.cwd());

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const outJsonFile = path.join(outDir, "llm-context.json");
      const outMdFile = path.join(outDir, "llm-context.md");

      fs.writeFileSync(outJsonFile, JSON.stringify(llmJson, null, 2), "utf8");
      fs.writeFileSync(outMdFile, llmMd, "utf8");

      console.log(
        `AI context exports successfully generated at:\n  - ${outJsonFile}\n  - ${outMdFile}`,
      );
    } catch (error) {
      console.error("AI context export failed:", (error as Error).message);
      process.exitCode = 1;
    }
  });
