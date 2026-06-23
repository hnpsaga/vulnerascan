import { access } from "fs/promises";
import { join } from "path";
import { ProjectType } from "../../models/project-type.js";
import type { ProjectInfo } from "../../models/project-info.js";
import type { ProjectDetector } from "../project-discovery.js";

export class NodeDetector implements ProjectDetector {
  async detect(directory: string): Promise<ProjectInfo | null> {
    const manifestPath = join(directory, "package.json");
    try {
      await access(manifestPath);
      return { type: ProjectType.Node, manifest: "package.json" };
    } catch {
      return null;
    }
  }
}
