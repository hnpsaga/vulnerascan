import { access } from "fs/promises";
import { join } from "path";
import { ProjectType } from "../../models/project-type.js";
import type { ProjectInfo } from "../../models/project-info.js";
import type { ProjectDetector } from "../project-discovery.js";

export class RustDetector implements ProjectDetector {
  async detect(directory: string): Promise<ProjectInfo | null> {
    const manifests = ["Cargo.toml", "Cargo.lock"];
    for (const manifest of manifests) {
      const manifestPath = join(directory, manifest);
      try {
        await access(manifestPath);
        return { type: ProjectType.Rust, manifest };
      } catch {
        continue;
      }
    }
    return null;
  }
}
