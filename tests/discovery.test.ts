import { describe, it, expect } from "vitest";
import { join } from "path";
import { ProjectDiscoveryService } from "../src/discovery/project-discovery.js";
import { NodeDetector } from "../src/discovery/detectors/node-detector.js";
import { MavenDetector } from "../src/discovery/detectors/maven-detector.js";
import { GradleDetector } from "../src/discovery/detectors/gradle-detector.js";
import { PythonDetector } from "../src/discovery/detectors/python-detector.js";
import { ProjectType } from "../src/models/project-type.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("NodeDetector", () => {
  const detector = new NodeDetector();

  it("detects Node.js project with package.json", async () => {
    const result = await detector.detect(join(FIXTURES, "node-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Node);
    expect(result!.manifest).toBe("package.json");
  });

  it("returns null for project without package.json", async () => {
    const result = await detector.detect(join(FIXTURES, "unknown-project"));
    expect(result).toBeNull();
  });
});

describe("MavenDetector", () => {
  const detector = new MavenDetector();

  it("detects Maven project with pom.xml", async () => {
    const result = await detector.detect(join(FIXTURES, "maven-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Maven);
    expect(result!.manifest).toBe("pom.xml");
  });

  it("returns null for project without pom.xml", async () => {
    const result = await detector.detect(join(FIXTURES, "unknown-project"));
    expect(result).toBeNull();
  });
});

describe("GradleDetector", () => {
  const detector = new GradleDetector();

  it("detects Gradle project with build.gradle", async () => {
    const result = await detector.detect(join(FIXTURES, "gradle-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Gradle);
    expect(result!.manifest).toBe("build.gradle");
  });

  it("detects Gradle project with build.gradle.kts", async () => {
    const result = await detector.detect(join(FIXTURES, "gradle-kts-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Gradle);
    expect(result!.manifest).toBe("build.gradle.kts");
  });

  it("returns null for project without Gradle files", async () => {
    const result = await detector.detect(join(FIXTURES, "unknown-project"));
    expect(result).toBeNull();
  });
});

describe("PythonDetector", () => {
  const detector = new PythonDetector();

  it("detects Python project with requirements.txt", async () => {
    const result = await detector.detect(join(FIXTURES, "python-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Python);
    expect(result!.manifest).toBe("requirements.txt");
  });

  it("detects Python project with pyproject.toml", async () => {
    const result = await detector.detect(join(FIXTURES, "python-pyproject"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Python);
    expect(result!.manifest).toBe("pyproject.toml");
  });

  it("returns null for project without Python files", async () => {
    const result = await detector.detect(join(FIXTURES, "unknown-project"));
    expect(result).toBeNull();
  });
});

describe("ProjectDiscoveryService", () => {
  const service = new ProjectDiscoveryService();

  it("discovers Node.js project", async () => {
    const result = await service.discover(join(FIXTURES, "node-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Node);
  });

  it("discovers Maven project", async () => {
    const result = await service.discover(join(FIXTURES, "maven-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Maven);
  });

  it("discovers Gradle project", async () => {
    const result = await service.discover(join(FIXTURES, "gradle-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Gradle);
  });

  it("discovers Gradle Kotlin project", async () => {
    const result = await service.discover(join(FIXTURES, "gradle-kts-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Gradle);
    expect(result!.manifest).toBe("build.gradle.kts");
  });

  it("discovers Python requirements project", async () => {
    const result = await service.discover(join(FIXTURES, "python-project"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Python);
  });

  it("discovers Python pyproject project", async () => {
    const result = await service.discover(join(FIXTURES, "python-pyproject"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ProjectType.Python);
    expect(result!.manifest).toBe("pyproject.toml");
  });

  it("returns null for unknown project", async () => {
    const result = await service.discover(join(FIXTURES, "unknown-project"));
    expect(result).toBeNull();
  });
});
