import { Workspace } from "../workspace/models/workspace.js";
import { Run } from "../workspace/models/run.js";
import { DependencyResolution } from "./models/dependency-resolution.js";
import { NpmManifestManager } from "./npm/npm-manifest-manager.js";
import { NpmLockfileGenerator } from "./npm/npm-lockfile-generator.js";
import { NpmResolutionParser } from "./npm/npm-resolution-parser.js";
import { ProjectType } from "../models/project-type.js";
import { RESOLUTION_SCHEMA_VERSION } from "../workspace/constants.js";
import path from "path";
import fs from "fs";
import { homedir } from "os";

export class DependencyResolutionService {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      this.baseDir = path.join(home, ".vulnerascan", "workspaces");
    }
  }

  async resolve(workspace: Workspace, run: Run): Promise<DependencyResolution> {
    const workspaceDir = path.join(this.baseDir, workspace.id);
    const runDir = path.join(workspaceDir, "runs", run.id);

    if (!fs.existsSync(runDir)) {
      throw new Error(`Run directory does not exist: ${runDir}`);
    }

    const resolutionJsonPath = path.join(runDir, "dependency-resolution.json");

    // Only Node.js is supported at the moment
    if (
      workspace.projectType !== (ProjectType.Node as string) &&
      workspace.projectType !== "node"
    ) {
      throw new Error(
        `Unsupported project type for dependency resolution: ${workspace.projectType}`,
      );
    }

    const manifestManager = new NpmManifestManager();
    const lockfileGenerator = new NpmLockfileGenerator();
    const resolutionParser = new NpmResolutionParser();

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

      const successArtifact: DependencyResolution = {
        schemaVersion: RESOLUTION_SCHEMA_VERSION,
        projectType: workspace.projectType,
        packageManager: "npm",
        resolutionSource,
        directDependencies: summary.directDependencies,
        totalDependencies: summary.totalDependencies,
      };

      await fs.promises.writeFile(
        resolutionJsonPath,
        JSON.stringify(successArtifact, null, 2),
        "utf8",
      );

      return successArtifact;
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
