import { Workspace } from "../../workspace/models/workspace.js";
import { Run } from "../../workspace/models/run.js";
import { DependencyResolution } from "../models/dependency-resolution.js";
import { NodeManifestManager } from "./npm-manifest-manager.js";
import { NodeLockfileGenerator } from "./npm-lockfile-generator.js";
import { NodeResolutionParser } from "./npm-resolution-parser.js";
import { RESOLUTION_SCHEMA_VERSION } from "../../workspace/constants.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export class NodeResolver {
  async resolve(workspace: Workspace, run: Run, baseDir: string): Promise<DependencyResolution> {
    const workspaceDir = path.join(baseDir, workspace.id);
    const runDir = path.join(workspaceDir, "runs", run.id);

    if (!fs.existsSync(runDir)) {
      throw new Error(`Run directory does not exist: ${runDir}`);
    }

    const resolutionJsonPath = path.join(runDir, "dependency-resolution.json");

    const manifestManager = new NodeManifestManager();
    const lockfileGenerator = new NodeLockfileGenerator();
    const resolutionParser = new NodeResolutionParser();

    try {
      // 1. Copy manifests into workspace manifests/ directory
      await manifestManager.copyManifests(workspace.sourcePath, workspaceDir);

      // 2. Determine lockfile resolution strategy
      const hasLock = await manifestManager.hasLockfile(workspaceDir);
      let resolutionSource: "existing-lockfile" | "generated-lockfile";

      if (hasLock) {
        resolutionSource = "existing-lockfile";
      } else {
        resolutionSource = "generated-lockfile";
        try {
          await lockfileGenerator.generateLockfile(workspaceDir);
        } catch {
          const failureArtifact: DependencyResolution = {
            schemaVersion: RESOLUTION_SCHEMA_VERSION,
            status: "failed",
            reason: "lockfile-generation-failed",
          };
          await fs.promises.writeFile(
            resolutionJsonPath,
            JSON.stringify(failureArtifact, null, 2),
            "utf8",
          );
          return failureArtifact;
        }
      }

      // 3. Parse lockfile
      const summary = await resolutionParser.parse(workspaceDir, resolutionSource);

      const manifestPath = path.join(workspace.sourcePath, "package.json");
      let sourceLockName = "";
      let lockfileGenName = "package-lock.json";
      if (summary.graph && summary.graph.packageManager) {
        if (summary.graph.packageManager === "pnpm") lockfileGenName = "pnpm-lock.yaml";
        else if (summary.graph.packageManager === "yarn") lockfileGenName = "yarn.lock";
      }

      if (hasLock) {
        const checkLocks = [
          "pnpm-lock.yaml",
          "yarn.lock",
          "package-lock.json",
          "npm-shrinkwrap.json",
        ];
        for (const lock of checkLocks) {
          if (fs.existsSync(path.join(workspaceDir, "manifests", lock))) {
            sourceLockName = lock;
            break;
          }
        }
      }

      const lockfilePath = hasLock
        ? path.join(workspace.sourcePath, sourceLockName)
        : path.join(workspaceDir, "generated", lockfileGenName);

      const manifestHash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(workspaceDir, "manifests", "package.json")))
        .digest("hex");

      const lockfileHash = crypto
        .createHash("sha256")
        .update(
          fs.readFileSync(
            hasLock
              ? path.join(workspaceDir, "manifests", sourceLockName)
              : path.join(workspaceDir, "generated", lockfileGenName),
          ),
        )
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
        packageManager: summary.graph?.packageManager || "npm",
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
