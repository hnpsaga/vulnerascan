import { access } from "fs/promises";
import { join } from "path";
import { ProjectType } from "../../models/project-type.js";
import type { ProjectInfo } from "../../models/project-info.js";
import type { ProjectDetector } from "../project-discovery.js";

export class GoDetector implements ProjectDetector {
  async detect(directory: string): Promise<ProjectInfo | null> {
    const manifests = ["go.mod", "go.sum"];
    for (const manifest of manifests) {
      const manifestPath = join(directory, manifest);
      try {
        await access(manifestPath);
        return { type: ProjectType.Go, manifest };
      } catch {
        continue;
      }
    }
    return null;
  }
}
