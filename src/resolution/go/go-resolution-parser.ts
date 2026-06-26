import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";

export class GoResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    _resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const goModPath = path.join(manifestsDir, "go.mod");
    const goSumPath = path.join(manifestsDir, "go.sum");

    if (!fs.existsSync(goModPath)) {
      throw new Error(`go.mod not found in manifests: ${goModPath}`);
    }

    const goModContent = await fs.promises.readFile(goModPath, "utf8");
    const moduleName = this.extractModuleName(goModContent) || "root";

    const rootId = `go:${moduleName}@1.0.0`;
    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: moduleName,
        version: "1.0.0",
        ecosystem: "go",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "go",
        manifest: "go.mod",
      },
    ];
    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();
    const allDeps = new Map<string, string>(); // name -> version

    // Helper to add dependencies
    const addDep = (name: string, version: string, isIndirect: boolean): void => {
      // Clean version
      version = version.replace(/^v/, "");
      allDeps.set(name, version);
      if (!isIndirect) {
        directDeps.add(name);
      }
    };

    // Find direct require lines outside of blocks
    const lines = goModContent.split(/\r?\n/);
    let inRequireBlock = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("require (")) {
        inRequireBlock = true;
        continue;
      }
      if (inRequireBlock && line === ")") {
        inRequireBlock = false;
        continue;
      }
      if (inRequireBlock) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          const version = parts[1];
          const isIndirect = line.includes("// indirect");
          addDep(name, version, isIndirect);
        }
      } else if (line.startsWith("require ") && !line.includes("(")) {
        const parts = line.replace("require ", "").trim().split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          const version = parts[1];
          const isIndirect = line.includes("// indirect");
          addDep(name, version, isIndirect);
        }
      }
    }

    // Now if go.sum exists, parse all versions from it to ensure complete transitive deps are represented
    if (fs.existsSync(goSumPath)) {
      const goSumContent = await fs.promises.readFile(goSumPath, "utf8");
      const sumLines = goSumContent.split(/\r?\n/);
      for (const rawLine of sumLines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          let version = parts[1];
          // go.sum lines often look like: github.com/gin-gonic/gin v1.8.1/go.mod h1:...
          if (version.endsWith("/go.mod")) {
            version = version.replace("/go.mod", "");
          }
          version = version.replace(/^v/, "");
          // Only overwrite or add if not already present or if we want lockfile version
          if (!allDeps.has(name)) {
            allDeps.set(name, version);
          }
        }
      }
    }

    // Add nodes and edges to graph
    for (const [name, version] of allDeps.entries()) {
      const isDirect = directDeps.has(name);
      const depId = `go:${name}@${version}`;

      nodes.push({
        id: depId,
        name,
        version,
        ecosystem: "go",
        dependencyType: "production",
        isDirect,
        isTransitive: !isDirect,
        parents: isDirect ? [rootId] : [],
        children: [],
        depth: isDirect ? 1 : 2,
        packageManager: "go",
        manifest: "go.mod",
      });

      if (isDirect) {
        edges.push({
          source: rootId,
          target: depId,
        });
      }
    }

    // Connect root to direct child nodes
    const rootNode = nodes[0];
    rootNode.children = nodes.filter((n) => n.parents.includes(rootId)).map((n) => n.id);

    // For any transitive node, let's mock they are parents/children of direct nodes or just orphaned from root
    // to preserve dependency relationships
    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "go",
      packageManager: "go",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }

  private extractModuleName(content: string): string | null {
    const match = /^\s*module\s+([^\s]+)/m.exec(content);
    return match ? match[1] : null;
  }
}
