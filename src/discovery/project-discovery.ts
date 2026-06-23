import type { ProjectInfo } from "../models/project-info.js";
import { NodeDetector } from "./detectors/node-detector.js";
import { MavenDetector } from "./detectors/maven-detector.js";
import { GradleDetector } from "./detectors/gradle-detector.js";
import { PythonDetector } from "./detectors/python-detector.js";

export interface ProjectDetector {
  detect(directory: string): Promise<ProjectInfo | null>;
}

export class ProjectDiscoveryService {
  private readonly detectors: ProjectDetector[];

  constructor() {
    // Detector execution order:
    // 1. Node — most common package manager ecosystem; early exit speeds up
    //    scans for the majority of users who work on Node.js projects.
    // 2. Maven — pom.xml is a well-known, unambiguous marker; check before
    //    Gradle because a project could theoretically have both files.
    // 3. Gradle — build.gradle / build.gradle.kts are distinct markers.
    // 4. Python — requirements.txt / pyproject.toml checked last to avoid
    //    clashing with more specific ecosystem markers.
    this.detectors = [
      new NodeDetector(),
      new MavenDetector(),
      new GradleDetector(),
      new PythonDetector(),
    ];
  }

  async discover(directory: string): Promise<ProjectInfo | null> {
    for (const detector of this.detectors) {
      const result = await detector.detect(directory);
      if (result) {
        return result;
      }
    }
    return null;
  }
}
