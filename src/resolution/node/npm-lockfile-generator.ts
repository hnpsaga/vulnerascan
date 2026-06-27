import { LockfileGenerator } from "../interfaces.js";
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";

export class NodeLockfileGenerator implements LockfileGenerator {
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

    // Also copy pnpm-workspace.yaml if present in manifestsDir
    const srcPnpmWorkspace = path.join(manifestsDir, "pnpm-workspace.yaml");
    if (fs.existsSync(srcPnpmWorkspace)) {
      await fs.promises.copyFile(srcPnpmWorkspace, path.join(generatedDir, "pnpm-workspace.yaml"));
    }

    // Determine lockfile generation style.
    // If workspace package.json indicates pnpm, yarn, etc., we can try to run that, but default to npm.
    let packageManager = "npm";
    try {
      const pkgContent = await fs.promises.readFile(srcPackageJson, "utf8");
      const pkg = JSON.parse(pkgContent) as { packageManager?: unknown };
      if (pkg.packageManager && typeof pkg.packageManager === "string") {
        if (pkg.packageManager.startsWith("pnpm")) packageManager = "pnpm";
        else if (pkg.packageManager.startsWith("yarn")) packageManager = "yarn";
      }
    } catch {
      // fallback to npm
    }

    try {
      if (packageManager === "pnpm") {
        execFileSync("pnpm", ["import"], {
          cwd: generatedDir,
          stdio: "pipe",
          env: { ...process.env },
        });
      } else if (packageManager === "yarn") {
        execFileSync("yarn", ["install"], {
          cwd: generatedDir,
          stdio: "pipe",
          env: { ...process.env },
        });
      } else {
        execFileSync("npm", ["install", "--package-lock-only"], {
          cwd: generatedDir,
          stdio: "pipe",
          env: {
            ...process.env,
            NO_UPDATE_NOTIFIER: "true",
          },
        });
      }
    } catch (error) {
      // Fallback: try generating npm package-lock.json if pnpm/yarn fails
      try {
        execFileSync("npm", ["install", "--package-lock-only"], {
          cwd: generatedDir,
          stdio: "pipe",
          env: {
            ...process.env,
            NO_UPDATE_NOTIFIER: "true",
          },
        });
      } catch {
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
}
export { NodeLockfileGenerator as NpmLockfileGenerator };
