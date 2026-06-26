import { readdir } from "fs/promises";
import { ProjectType } from "../../models/project-type.js";
import type { ProjectInfo } from "../../models/project-info.js";
import type { ProjectDetector } from "../project-discovery.js";

export class DotnetDetector implements ProjectDetector {
  async detect(directory: string): Promise<ProjectInfo | null> {
    try {
      const files = await readdir(directory);

      // 1. Check for *.csproj files first
      const csprojFile = files.find((file) => file.endsWith(".csproj"));
      if (csprojFile) {
        return { type: ProjectType.Dotnet, manifest: csprojFile };
      }

      // 2. Check for packages.lock.json or Directory.Packages.props
      const manifests = ["packages.lock.json", "Directory.Packages.props"];
      for (const manifest of manifests) {
        if (files.includes(manifest)) {
          return { type: ProjectType.Dotnet, manifest };
        }
      }
    } catch {
      // Ignore directory read errors
    }
    return null;
  }
}
