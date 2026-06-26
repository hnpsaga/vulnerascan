import { ManifestManager } from "../interfaces.js";
import path from "path";
import fs from "fs";

export class NpmManifestManager implements ManifestManager {
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

    // If package-lock.json exists, copy it
    const sourcePackageLock = path.join(sourcePath, "package-lock.json");
    if (fs.existsSync(sourcePackageLock)) {
      await fs.promises.copyFile(sourcePackageLock, path.join(manifestsDir, "package-lock.json"));
    }

    // If npm-shrinkwrap.json exists, copy it
    const sourceShrinkwrap = path.join(sourcePath, "npm-shrinkwrap.json");
    if (fs.existsSync(sourceShrinkwrap)) {
      await fs.promises.copyFile(sourceShrinkwrap, path.join(manifestsDir, "npm-shrinkwrap.json"));
    }
  }

  async hasLockfile(workspacePath: string): Promise<boolean> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const packageLockPath = path.join(manifestsDir, "package-lock.json");
    const shrinkwrapPath = path.join(manifestsDir, "npm-shrinkwrap.json");

    try {
      await fs.promises.access(packageLockPath);
      return true;
    } catch {
      try {
        await fs.promises.access(shrinkwrapPath);
        return true;
      } catch {
        return false;
      }
    }
  }
}
