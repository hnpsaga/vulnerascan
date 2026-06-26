import { ManifestManager } from "../interfaces.js";
import path from "path";
import fs from "fs";

export class JavaManifestManager implements ManifestManager {
  async copyManifests(sourcePath: string, workspacePath: string): Promise<void> {
    const manifestsDir = path.join(workspacePath, "manifests");
    if (!fs.existsSync(manifestsDir)) {
      await fs.promises.mkdir(manifestsDir, { recursive: true });
    }

    const filesToCopy = ["pom.xml", "build.gradle", "build.gradle.kts"];
    for (const file of filesToCopy) {
      const src = path.join(sourcePath, file);
      if (fs.existsSync(src)) {
        await fs.promises.copyFile(src, path.join(manifestsDir, file));
      }
    }
  }

  async hasLockfile(_workspacePath: string): Promise<boolean> {
    // Neither Maven nor standard Gradle has a single standard lockfile we parse natively for now,
    // or we treat them as generated/existing dynamically. Let's return false as lockfile generation
    // is simulated or processed directly by our parser/resolver.
    await Promise.resolve();
    return false;
  }
}
