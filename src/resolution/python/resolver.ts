import { Workspace } from "../../workspace/models/workspace.js";
import { Run } from "../../workspace/models/run.js";
import { DependencyResolution } from "../models/dependency-resolution.js";
import { PythonManifestManager } from "./python-manifest-manager.js";
import { PythonResolutionParser } from "./python-resolution-parser.js";
import { RESOLUTION_SCHEMA_VERSION } from "../../workspace/constants.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export class PythonResolver {
  async resolve(workspace: Workspace, run: Run, baseDir: string): Promise<DependencyResolution> {
    const workspaceDir = path.join(baseDir, workspace.id);
    const runDir = path.join(workspaceDir, "runs", run.id);

    if (!fs.existsSync(runDir)) {
      throw new Error(`Run directory does not exist: ${runDir}`);
    }

    const resolutionJsonPath = path.join(runDir, "dependency-resolution.json");

    const manifestManager = new PythonManifestManager();
    const resolutionParser = new PythonResolutionParser();

    try {
      // 1. Copy manifests into workspace manifests/ directory
      await manifestManager.copyManifests(workspace.sourcePath, workspaceDir);

      // 2. Determine lockfile resolution strategy
      const hasLock = await manifestManager.hasLockfile(workspaceDir);
      const resolutionSource = hasLock ? "existing-lockfile" : "generated-lockfile";

      // 3. Parse manifest to generate resolution summary
      const summary = await resolutionParser.parse(workspaceDir, resolutionSource);

      // Determine manifest filename
      const checkManifests = ["requirements.txt", "pyproject.toml", "poetry.lock", "Pipfile.lock"];
      let manifestFilename = "";
      for (const manifest of checkManifests) {
        if (fs.existsSync(path.join(workspaceDir, "manifests", manifest))) {
          manifestFilename = manifest;
          break;
        }
      }
      if (!manifestFilename) {
        manifestFilename = "requirements.txt";
      }

      // Determine lockfile filename
      const checkLocks = ["poetry.lock", "Pipfile.lock"];
      let lockfileFilename = manifestFilename;
      if (hasLock) {
        for (const lock of checkLocks) {
          if (fs.existsSync(path.join(workspaceDir, "manifests", lock))) {
            lockfileFilename = lock;
            break;
          }
        }
      }

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
        packageManager: summary.graph?.packageManager || "pip",
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
