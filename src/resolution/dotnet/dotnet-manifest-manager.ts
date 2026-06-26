import { ManifestManager } from "../interfaces.js";
import path from "path";
import fs from "fs";

export class DotnetManifestManager implements ManifestManager {
  async copyManifests(sourcePath: string, workspacePath: string): Promise<void> {
    const manifestsDir = path.join(workspacePath, "manifests");
    if (!fs.existsSync(manifestsDir)) {
      await fs.promises.mkdir(manifestsDir, { recursive: true });
    }

    try {
      const files = await fs.promises.readdir(sourcePath);
      // Copy all *.csproj files
      for (const file of files) {
        if (file.endsWith(".csproj")) {
          await fs.promises.copyFile(path.join(sourcePath, file), path.join(manifestsDir, file));
        }
      }

      // Copy other manifests
      const otherFiles = ["packages.lock.json", "Directory.Packages.props"];
      for (const file of otherFiles) {
        const src = path.join(sourcePath, file);
        if (fs.existsSync(src)) {
          await fs.promises.copyFile(src, path.join(manifestsDir, file));
        }
      }
    } catch {
      // Ignore copy errors
    }
  }

  async hasLockfile(workspacePath: string): Promise<boolean> {
    const manifestsDir = path.join(workspacePath, "manifests");
    try {
      await fs.promises.access(path.join(manifestsDir, "packages.lock.json"));
      return true;
    } catch {
      return false;
    }
  }
}
