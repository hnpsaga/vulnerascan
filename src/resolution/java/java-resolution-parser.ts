import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";
import { ProjectType } from "../../models/project-type.js";

export class JavaResolutionParser implements ResolutionParser {
  private projectType: ProjectType;

  constructor(projectType: ProjectType) {
    this.projectType = projectType;
  }

  async parse(
    workspacePath: string,
    _resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");

    if (this.projectType === ProjectType.Maven) {
      return this.parseMaven(manifestsDir);
    } else if (this.projectType === ProjectType.Gradle) {
      return this.parseGradle(manifestsDir);
    } else {
      throw new Error(`Unsupported project type for Java resolution parser: ${this.projectType}`);
    }
  }

  private async parseMaven(manifestsDir: string): Promise<DependencySummary> {
    const pomXmlPath = path.join(manifestsDir, "pom.xml");
    if (!fs.existsSync(pomXmlPath)) {
      throw new Error(`pom.xml not found in manifests: ${pomXmlPath}`);
    }

    const content = await fs.promises.readFile(pomXmlPath, "utf8");

    // Extract groupId, artifactId, version of the root project
    const rootGroupId = this.extractXmlTag(content, "groupId") || "com.example";
    const rootArtifactId = this.extractXmlTag(content, "artifactId") || "app";
    const rootVersion = this.extractXmlTag(content, "version") || "1.0.0";
    const rootId = `maven:${rootGroupId}:${rootArtifactId}@${rootVersion}`;

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: `${rootGroupId}:${rootArtifactId}`,
        version: rootVersion,
        ecosystem: "maven",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "maven",
        manifest: "pom.xml",
      },
    ];

    const edges: DependencyEdge[] = [];

    // Simple parsing of <dependencies> section
    const dependenciesRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
    let match;
    const directDeps = new Set<string>();

    while ((match = dependenciesRegex.exec(content)) !== null) {
      const depBlock = match[1];
      const groupId = this.extractXmlTag(depBlock, "groupId");
      const artifactId = this.extractXmlTag(depBlock, "artifactId");
      const version = this.extractXmlTag(depBlock, "version") || "0.0.0";
      const scope = this.extractXmlTag(depBlock, "scope") || "compile";

      if (groupId && artifactId) {
        const depName = `${groupId}:${artifactId}`;
        const depId = `maven:${depName}@${version}`;
        const depType = scope === "test" ? "development" : "production";

        directDeps.add(depName);

        nodes.push({
          id: depId,
          name: depName,
          version,
          ecosystem: "maven",
          dependencyType: depType,
          isDirect: true,
          isTransitive: false,
          parents: [rootId],
          children: [],
          depth: 1,
          packageManager: "maven",
          manifest: "pom.xml",
        });

        edges.push({
          source: rootId,
          target: depId,
        });
      }
    }

    // Connect root to child nodes
    const rootNode = nodes[0];
    rootNode.children = nodes.slice(1).map((n) => n.id);

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "maven",
      packageManager: "maven",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }

  private async parseGradle(manifestsDir: string): Promise<DependencySummary> {
    let buildGradlePath = path.join(manifestsDir, "build.gradle");
    let manifestName = "build.gradle";
    if (!fs.existsSync(buildGradlePath)) {
      buildGradlePath = path.join(manifestsDir, "build.gradle.kts");
      manifestName = "build.gradle.kts";
    }

    if (!fs.existsSync(buildGradlePath)) {
      throw new Error(`build.gradle or build.gradle.kts not found in manifests: ${manifestsDir}`);
    }

    const content = await fs.promises.readFile(buildGradlePath, "utf8");

    // Simple root info for Gradle
    const rootGroupId = "com.example";
    const rootArtifactId = "app";
    const rootVersion = "1.0.0";
    const rootId = `maven:${rootGroupId}:${rootArtifactId}@${rootVersion}`;

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: `${rootGroupId}:${rootArtifactId}`,
        version: rootVersion,
        ecosystem: "maven",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "gradle",
        manifest: manifestName,
      },
    ];

    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();

    // Matches implementation("group:name:version"), testImplementation('group:name:version'), etc.
    const gradleDepRegex =
      /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly)\s*\(?\s*['"]([^'"]+?)['"]\s*\)?/g;
    let match;

    while ((match = gradleDepRegex.exec(content)) !== null) {
      const coordinate = match[1];
      const parts = coordinate.split(":");
      if (parts.length >= 2) {
        const groupId = parts[0];
        const artifactId = parts[1];
        const version = parts[2] || "0.0.0";
        const depName = `${groupId}:${artifactId}`;
        const depId = `maven:${depName}@${version}`;

        const isTest = match[0].includes("test");
        const depType = isTest ? "development" : "production";

        directDeps.add(depName);

        nodes.push({
          id: depId,
          name: depName,
          version,
          ecosystem: "maven",
          dependencyType: depType,
          isDirect: true,
          isTransitive: false,
          parents: [rootId],
          children: [],
          depth: 1,
          packageManager: "gradle",
          manifest: manifestName,
        });

        edges.push({
          source: rootId,
          target: depId,
        });
      }
    }

    // Connect root to children
    const rootNode = nodes[0];
    rootNode.children = nodes.slice(1).map((n) => n.id);

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "gradle",
      packageManager: "gradle",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }

  private extractXmlTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>\\s*([^<\\s]+)\\s*</${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1] : null;
  }
}
