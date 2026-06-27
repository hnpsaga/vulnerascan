import { ProjectType } from "../models/project-type.js";
import { ProjectDiscoveryService } from "../discovery/project-discovery.js";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { RunManager } from "../workspace/run-manager.js";
import { DependencyResolutionService } from "../resolution/dependency-resolution-service.js";
import { loadConfig } from "../provider/config/config.js";
import { FilesystemVulnerabilityCache } from "../provider/cache/filesystem-cache.js";
import { OsvClient } from "../osv/index.js";
import { VulnerabilityDetector } from "../vulnerability/detector.js";
import { homedir } from "os";
import path from "path";
import fs from "fs";

export interface ScanPipelineOptions {
  directory: string;
  runName?: string;
  outputPath?: string;
  onLog?: (message: string) => void;
}

export class ScanPipeline {
  async execute(options: ScanPipelineOptions): Promise<number> {
    const { directory, runName, outputPath, onLog = console.log } = options;

    const discovery = new ProjectDiscoveryService();
    const project = await discovery.discover(directory);

    if (!project) {
      console.error("No supported project type detected.");
      return 1;
    }

    onLog(`Project Type: ${project.type}`);
    onLog(`Manifest: ${project.manifest}`);

    // Resolve / create workspace
    const workspaceManager = new WorkspaceManager();
    const workspace = await workspaceManager.findOrCreateWorkspace(directory, project.type);

    // Create new scan run
    const runManager = new RunManager();
    const run = await runManager.createRun(workspace.id, project, { name: runName });

    onLog("");
    onLog(`Workspace: ${workspace.name}`);
    const runDisplay = run.name ? run.name : new Date(run.timestamp).toISOString();
    onLog(`Run: ${runDisplay}`);

    // Run dependency resolution
    if (
      project.type === ProjectType.Node ||
      project.type === ProjectType.Maven ||
      project.type === ProjectType.Gradle ||
      project.type === ProjectType.Python ||
      project.type === ProjectType.Go ||
      project.type === ProjectType.Rust ||
      project.type === ProjectType.Dotnet ||
      project.type === ProjectType.PHP
    ) {
      const resolutionService = new DependencyResolutionService();
      const resolution = await resolutionService.resolve(workspace, run);

      if (resolution.status === "failed") {
        const { WorkspaceApiService } = await import("../workspace/workspace-api-service.js");
        const apiService = new WorkspaceApiService();
        await apiService.registerProject({
          path: directory,
          name: workspace.name,
          ecosystem: project.type,
          status: "failed",
          workspaceId: workspace.id,
        });

        await apiService.metadataService.recordRun(
          workspace.id,
          {
            runId: run.id,
            timestamp: run.timestamp,
            name: run.name,
            status: "failed",
            ecosystem: project.type,
          },
          {
            status: "failed",
            error: "Dependency resolution failed.",
          },
        );

        console.error("Dependency resolution failed.");
        return 1;
      }

      // Output resolution details
      onLog("");
      onLog(`Resolution Source: ${resolution.resolutionSource}`);
      onLog("");
      onLog(`Direct Dependencies: ${resolution.directDependencies}`);
      onLog(`Total Dependencies: ${resolution.totalDependencies}`);

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

        onLog("");
        onLog("Querying OSV for vulnerabilities...");
        const response = await osvClient.queryPackages(coordinates);

        onLog(`Vulnerabilities found: ${response.vulnerabilities.length}`);

        // Orchestrate vulnerability detection pipeline
        onLog("Running vulnerability detection...");

        const detector = new VulnerabilityDetector({ osvClient });
        const detectionResult = await detector.detect(resolution.graph);

        // Write vulnerabilities.json to run directory
        const runVulnerabilitiesPath = path.join(runDir, "vulnerabilities.json");
        await fs.promises.writeFile(
          runVulnerabilitiesPath,
          JSON.stringify(detectionResult, null, 2),
          "utf8",
        );

        // Write vulnerabilities.json to user's specified output directory if provided
        if (outputPath) {
          if (!fs.existsSync(outputPath)) {
            await fs.promises.mkdir(outputPath, { recursive: true });
          }
          const projectVulnerabilitiesPath = path.join(outputPath, "vulnerabilities.json");
          await fs.promises.writeFile(
            projectVulnerabilitiesPath,
            JSON.stringify(detectionResult, null, 2),
            "utf8",
          );
        }

        onLog(`Findings generated: ${detectionResult.findings.length}`);

        // Register/update project and metadata on success
        const { WorkspaceApiService } = await import("../workspace/workspace-api-service.js");
        const apiService = new WorkspaceApiService();
        const findingsCount = detectionResult.findings.length;
        const projectStatus = findingsCount > 0 ? "vulnerable" : "healthy";

        await apiService.registerProject({
          path: directory,
          name: workspace.name,
          ecosystem: project.type,
          status: projectStatus,
          workspaceId: workspace.id,
        });

        const startTime = new Date(run.timestamp).getTime();
        const durationMs = Date.now() - startTime;

        await apiService.metadataService.recordRun(
          workspace.id,
          {
            runId: run.id,
            timestamp: run.timestamp,
            name: run.name,
            status: "completed",
            durationMs,
            ecosystem: project.type,
          },
          {
            status: projectStatus,
            directDependencies: resolution.directDependencies,
            totalDependencies: resolution.totalDependencies,
            vulnerabilitiesCount: findingsCount,
          },
        );

        // Reporting Engine execution
        const { Reporter } = await import("../reporting/index.js");
        const reporter = new Reporter({
          projectDirectory: directory,
          runDirectory: runDir,
          outputDirectory: outputPath,
        });
        return await reporter.report(detectionResult);
      }
    }
    return 0;
  }
}
