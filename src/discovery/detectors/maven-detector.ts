import { access } from "fs/promises";
import { join } from "path";
import { ProjectType } from "../../models/project-type.js";
import type { ProjectInfo } from "../../models/project-info.js";
import type { ProjectDetector } from "../project-discovery.js";

export class MavenDetector implements ProjectDetector {
  async detect(directory: string): Promise<ProjectInfo | null> {
    const manifestPath = join(directory, "pom.xml");
    try {
      await access(manifestPath);
      return { type: ProjectType.Maven, manifest: "pom.xml" };
    } catch {
      return null;
    }
  }
}
