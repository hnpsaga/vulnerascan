import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import path from "path";
import fs from "fs";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface LockfileV1Dep {
  dependencies?: Record<string, LockfileV1Dep>;
  [key: string]: unknown;
}

interface Lockfile {
  packages?: Record<
    string,
    {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      [key: string]: unknown;
    }
  >;
  dependencies?: Record<string, LockfileV1Dep>;
  [key: string]: unknown;
}

export class NpmResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const packageJsonPath = path.join(manifestsDir, "package.json");

    try {
      await fs.promises.access(packageJsonPath);
    } catch {
      throw new Error(`package.json not found in manifests: ${packageJsonPath}`);
    }

    // 1. Get Direct Dependencies count from package.json
    let directDependencies = 0;
    try {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf8");
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;
      const directDeps = new Set<string>();
      const depFields = [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ];

      for (const field of depFields) {
        const deps = packageJson[field];
        if (deps && typeof deps === "object") {
          Object.keys(deps).forEach((dep) => directDeps.add(dep));
        }
      }
      directDependencies = directDeps.size;
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${(error as Error).message}`);
    }

    // 2. Locate lockfile
    let lockfilePath = "";
    if (resolutionSource === "existing-lockfile") {
      const packageLockPath = path.join(manifestsDir, "package-lock.json");
      const shrinkwrapPath = path.join(manifestsDir, "npm-shrinkwrap.json");
      if (fs.existsSync(packageLockPath)) {
        lockfilePath = packageLockPath;
      } else if (fs.existsSync(shrinkwrapPath)) {
        lockfilePath = shrinkwrapPath;
      } else {
        throw new Error("No lockfile or shrinkwrap found in manifests directory");
      }
    } else {
      const generatedLockPath = path.join(workspacePath, "generated", "package-lock.json");
      if (fs.existsSync(generatedLockPath)) {
        lockfilePath = generatedLockPath;
      } else {
        throw new Error("No generated lockfile found in generated directory");
      }
    }

    // 3. Parse lockfile to get Total Dependencies count
    let totalDependencies = 0;
    try {
      const lockfileContent = await fs.promises.readFile(lockfilePath, "utf8");
      const lockfile = JSON.parse(lockfileContent) as Lockfile;

      if (lockfile.packages) {
        // v2/v3 lockfile format: count all packages except the root key ""
        totalDependencies = Object.keys(lockfile.packages).filter((key) => key !== "").length;
      } else if (lockfile.dependencies) {
        // v1 lockfile format: recursively count dependencies
        totalDependencies = this.countV1Dependencies(lockfile.dependencies);
      }
    } catch (error) {
      throw new Error(`Failed to parse lockfile at ${lockfilePath}: ${(error as Error).message}`);
    }

    return {
      directDependencies,
      totalDependencies,
    };
  }

  private countV1Dependencies(depsObj: Record<string, LockfileV1Dep>): number {
    if (!depsObj || typeof depsObj !== "object") {
      return 0;
    }
    let count = 0;
    for (const key of Object.keys(depsObj)) {
      count++; // count current dependency
      const val = depsObj[key];
      if (val && typeof val === "object" && val.dependencies) {
        count += this.countV1Dependencies(val.dependencies);
      }
    }
    return count;
  }
}
