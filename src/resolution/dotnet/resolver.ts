import { Workspace } from "../../workspace/models/workspace.js";
import { Run } from "../../workspace/models/run.js";
import { DependencyResolution } from "../models/dependency-resolution.js";
import { DotnetManifestManager } from "./dotnet-manifest-manager.js";
import { DotnetResolutionParser } from "./dotnet-resolution-parser.js";
import { RESOLUTION_SCHEMA_VERSION } from "../../workspace/constants.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export class DotnetResolver {
  async resolve(workspace: Workspace, run: Run, baseDir: string): Promise<DependencyResolution> {
    const workspaceDir = path.join(baseDir, workspace.id);
    const runDir = path.join(workspaceDir, "runs", run.id);

    if (!fs.existsSync(runDir)) {
      throw new Error(`Run directory does not exist: ${runDir}`);
    }

    const resolutionJsonPath = path.join(runDir, "dependency-resolution.json");

    const manifestManager = new DotnetManifestManager();
    const resolutionParser = new DotnetResolutionParser();

    try {
      // 1. Copy manifests into workspace manifests/ directory
      await manifestManager.copyManifests(workspace.sourcePath, workspaceDir);

      // 2. Determine lockfile resolution strategy
      const hasLock = await manifestManager.hasLockfile(workspaceDir);
      const resolutionSource = hasLock ? "existing-lockfile" : "generated-lockfile";

      // 3. Parse manifest to generate resolution summary
      const summary = await resolutionParser.parse(workspaceDir, resolutionSource);

      // Determine csproj filename
      const manifestsDir = path.join(workspaceDir, "manifests");
      const files = await fs.promises.readdir(manifestsDir);
      const csprojFile = files.find((f) => f.endsWith(".csproj"));
      if (!csprojFile) {
        throw new Error("No .csproj project file found to resolve.");
      }

      const manifestFilename = csprojFile;
      const lockfileFilename = hasLock ? "packages.lock.json" : csprojFile;

      const manifestPath = path.join(workspace.sourcePath, manifestFilename);
      const lockfilePath = path.join(workspace.sourcePath, lockfileFilename);

      const manifestHash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(workspaceDir, "manifests", manifestFilename)))
        .digest("hex");

      const lockfileHash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(workspaceDir, "manifests", lockfileFilename)))
        .digest("hex");

      const successArtifact: DependencyResolution = {
        schemaVersion: RESOLUTION_SCHEMA_VERSION,
        workspaceId: workspace.id,
        projectId: workspace.id,
        scanId: run.id,
        manifestPath,
        lockfilePath,
        manifestHash,
        lockfileHash,
        projectType: workspace.projectType,
        packageManager: "nuget",
        resolutionSource,
        directDependencies: summary.directDependencies,
        totalDependencies: summary.totalDependencies,
      };

      await fs.promises.writeFile(
        resolutionJsonPath,
        JSON.stringify(successArtifact, null, 2),
        "utf8",
      );

      if (summary.graph) {
        const graphJsonPath = path.join(runDir, "dependency-graph.json");
        await fs.promises.writeFile(graphJsonPath, JSON.stringify(summary.graph, null, 2), "utf8");
      }

      return {
        ...successArtifact,
        graph: summary.graph,
      };
    } catch (error) {
      const failureArtifact: DependencyResolution = {
        schemaVersion: RESOLUTION_SCHEMA_VERSION,
        status: "failed",
        reason: (error as Error).message || "unknown-resolution-failure",
      };
      await fs.promises.writeFile(
        resolutionJsonPath,
        JSON.stringify(failureArtifact, null, 2),
        "utf8",
      );
      return failureArtifact;
    }
  }
}
