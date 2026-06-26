import { Workspace } from "../../workspace/models/workspace.js";
import { Run } from "../../workspace/models/run.js";
import { DependencyResolution } from "../models/dependency-resolution.js";
import { JavaManifestManager } from "./java-manifest-manager.js";
import { JavaResolutionParser } from "./java-resolution-parser.js";
import { RESOLUTION_SCHEMA_VERSION } from "../../workspace/constants.js";
import { ProjectType } from "../../models/project-type.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export class JavaResolver {
  async resolve(workspace: Workspace, run: Run, baseDir: string): Promise<DependencyResolution> {
    const workspaceDir = path.join(baseDir, workspace.id);
    const runDir = path.join(workspaceDir, "runs", run.id);

    if (!fs.existsSync(runDir)) {
      throw new Error(`Run directory does not exist: ${runDir}`);
    }

    const resolutionJsonPath = path.join(runDir, "dependency-resolution.json");

    const manifestManager = new JavaManifestManager();
    const resolutionParser = new JavaResolutionParser(
      workspace.projectType as unknown as ProjectType,
    );

    try {
      // 1. Copy manifests into workspace manifests/ directory
      await manifestManager.copyManifests(workspace.sourcePath, workspaceDir);

      // 2. Since Maven/Gradle don't generate standard lockfiles, we treat it as existing-lockfile or generated-lockfile.
      // Let's use generated-lockfile for simplicity.
      const resolutionSource = "generated-lockfile";

      // 3. Parse manifest to generate resolution summary
      const summary = await resolutionParser.parse(workspaceDir, resolutionSource);

      let manifestFilename = "pom.xml";
      if ((workspace.projectType as unknown as ProjectType) === ProjectType.Gradle) {
        manifestFilename = fs.existsSync(path.join(workspaceDir, "manifests", "build.gradle.kts"))
          ? "build.gradle.kts"
          : "build.gradle";
      }

      const manifestPath = path.join(workspace.sourcePath, manifestFilename);
      const manifestHash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(workspaceDir, "manifests", manifestFilename)))
        .digest("hex");

      const successArtifact: DependencyResolution = {
        schemaVersion: RESOLUTION_SCHEMA_VERSION,
        workspaceId: workspace.id,
        projectId: workspace.id,
        scanId: run.id,
        manifestPath,
        lockfilePath: manifestPath, // Gradle/Maven parses the manifest directly
        manifestHash,
        lockfileHash: manifestHash,
        projectType: workspace.projectType,
        packageManager: workspace.projectType,
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
