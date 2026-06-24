import { LockfileGenerator } from "../interfaces.js";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

export class NpmLockfileGenerator implements LockfileGenerator {
  async generateLockfile(workspacePath: string): Promise<void> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const generatedDir = path.join(workspacePath, "generated");

    if (!fs.existsSync(generatedDir)) {
      await fs.promises.mkdir(generatedDir, { recursive: true });
    }

    const srcPackageJson = path.join(manifestsDir, "package.json");
    if (!fs.existsSync(srcPackageJson)) {
      throw new Error(`package.json not found in manifests: ${srcPackageJson}`);
    }

    const destPackageJson = path.join(generatedDir, "package.json");
    await fs.promises.copyFile(srcPackageJson, destPackageJson);

    // Run npm install --package-lock-only in generated/ directory
    try {
      execSync("npm install --package-lock-only", {
        cwd: generatedDir,
        stdio: "pipe",
        env: {
          ...process.env,
          // Suppress npm update notifier or other verbose logs if needed
          NO_UPDATE_NOTIFIER: "true",
        },
      });
    } catch (error) {
      // Clean up generated files if they were created and failed
      const destLockfile = path.join(generatedDir, "package-lock.json");
      if (fs.existsSync(destLockfile)) {
        try {
          fs.unlinkSync(destLockfile);
        } catch {
          // Ignore clean-up error
        }
      }
      throw error;
    }
  }
}
