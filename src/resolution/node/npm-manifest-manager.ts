import { ManifestManager } from "../interfaces.js";
import path from "path";
import fs from "fs";

// --- Node Ecosystem Manifest Manager ---
export class NodeManifestManager implements ManifestManager {
  async copyManifests(sourcePath: string, workspacePath: string): Promise<void> {
    const manifestsDir = path.join(workspacePath, "manifests");
    if (!fs.existsSync(manifestsDir)) {
      await fs.promises.mkdir(manifestsDir, { recursive: true });
    }

    const sourcePackageJson = path.join(sourcePath, "package.json");
    if (!fs.existsSync(sourcePackageJson)) {
      throw new Error(`package.json not found in source directory: ${sourcePath}`);
    }

    // Always copy package.json
    await fs.promises.copyFile(sourcePackageJson, path.join(manifestsDir, "package.json"));

    // Copy any pnpm-workspace.yaml if exists
    const sourcePnpmWorkspace = path.join(sourcePath, "pnpm-workspace.yaml");
    if (fs.existsSync(sourcePnpmWorkspace)) {
      await fs.promises.copyFile(
        sourcePnpmWorkspace,
        path.join(manifestsDir, "pnpm-workspace.yaml"),
      );
    }

    // Copy lockfiles if they exist
    const lockfiles = ["package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock"];
    for (const lockfile of lockfiles) {
      const src = path.join(sourcePath, lockfile);
      if (fs.existsSync(src)) {
        await fs.promises.copyFile(src, path.join(manifestsDir, lockfile));
      }
    }
  }

  async hasLockfile(workspacePath: string): Promise<boolean> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const lockfiles = ["package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock"];
    for (const file of lockfiles) {
      try {
        await fs.promises.access(path.join(manifestsDir, file));
        return true;
      } catch {
        // continue
      }
    }
    return false;
  }
}
export { NodeManifestManager as NpmManifestManager };
