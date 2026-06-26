import { ManifestManager } from "../interfaces.js";
import path from "path";
import fs from "fs";

export class GoManifestManager implements ManifestManager {
  async copyManifests(sourcePath: string, workspacePath: string): Promise<void> {
    const manifestsDir = path.join(workspacePath, "manifests");
    if (!fs.existsSync(manifestsDir)) {
      await fs.promises.mkdir(manifestsDir, { recursive: true });
    }

    const filesToCopy = ["go.mod", "go.sum"];

    for (const file of filesToCopy) {
      const src = path.join(sourcePath, file);
      if (fs.existsSync(src)) {
        await fs.promises.copyFile(src, path.join(manifestsDir, file));
      }
    }
  }

  async hasLockfile(workspacePath: string): Promise<boolean> {
    const manifestsDir = path.join(workspacePath, "manifests");
    try {
      await fs.promises.access(path.join(manifestsDir, "go.sum"));
      return true;
    } catch {
      return false;
    }
  }
}
