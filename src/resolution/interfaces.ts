import { DependencySummary } from "./models/dependency-summary.js";

export interface ManifestManager {
  /**
   * Copies relevant project manifests from the user's source repository
   * to the designated manifests directory in the local workspace.
   */
  copyManifests(sourcePath: string, workspacePath: string): Promise<void>;

  /**
   * Checks if an existing lockfile is present in the workspace's manifest directory.
   */
  hasLockfile(workspacePath: string): Promise<boolean>;
}

export interface LockfileGenerator {
  /**
   * Generates a lockfile inside the workspace's generated directory.
   */
  generateLockfile(workspacePath: string): Promise<void>;
}

export interface ResolutionParser {
  /**
   * Parses the manifest/lockfile inside the workspace to produce a dependency summary.
   */
  parse(
    workspacePath: string,
    resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary>;
}
