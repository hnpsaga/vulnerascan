import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";

interface NuGetLockfileDependency {
  type?: string;
  resolved?: string;
  contentHash?: string;
}

interface NuGetLockfile {
  version?: number;
  dependencies?: Record<string, Record<string, NuGetLockfileDependency>>;
}

export class DotnetResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    _resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");

    // Find the csproj file
    const files = await fs.promises.readdir(manifestsDir);
    const csprojFile = files.find((f) => f.endsWith(".csproj"));
    if (!csprojFile) {
      throw new Error("No .csproj project file found to parse.");
    }

    const csprojPath = path.join(manifestsDir, csprojFile);
    const lockfilePath = path.join(manifestsDir, "packages.lock.json");

    const csprojContent = await fs.promises.readFile(csprojPath, "utf8");

    const rootName = path.basename(csprojFile, ".csproj");
    const rootId = `nuget:${rootName.toLowerCase()}@1.0.0`;

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: rootName,
        version: "1.0.0",
        ecosystem: "nuget",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "nuget",
        manifest: csprojFile,
      },
    ];
    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();

    // 1. Extract direct dependencies from csproj using regex
    const packageRefRegex = /<PackageReference\s+([\s\S]*?)\/>/gi;
    let match;
    while ((match = packageRefRegex.exec(csprojContent)) !== null) {
      const attributes = match[1];
      const includeMatch = /Include\s*=\s*["']([^"']+)["']/i.exec(attributes);
      const versionMatch = /Version\s*=\s*["']([^"']+)["']/i.exec(attributes);

      if (includeMatch) {
        const name = includeMatch[1];
        const version = versionMatch ? versionMatch[1] : "0.0.0";
        directDeps.add(name.toLowerCase());

        // If no lockfile, we add direct dependencies directly to the graph
        if (!fs.existsSync(lockfilePath)) {
          const depId = `nuget:${name.toLowerCase()}@${version}`;
          nodes.push({
            id: depId,
            name,
            version,
            ecosystem: "nuget",
            dependencyType: "production",
            isDirect: true,
            isTransitive: false,
            parents: [rootId],
            children: [],
            depth: 1,
            packageManager: "nuget",
            manifest: csprojFile,
          });
          edges.push({
            source: rootId,
            target: depId,
          });
        }
      }
    }

    // 2. If packages.lock.json exists, parse it and build full graph
    if (fs.existsSync(lockfilePath)) {
      const lockContent = await fs.promises.readFile(lockfilePath, "utf8");
      const lockJson = JSON.parse(lockContent) as NuGetLockfile;
      const frameworks = lockJson.dependencies || {};

      const nodeMap = new Map<string, DependencyNode>();
      nodeMap.set(rootName.toLowerCase(), nodes[0]);

      // Iterate through all target frameworks in the lockfile
      for (const framework of Object.keys(frameworks)) {
        const deps = frameworks[framework] || {};
        for (const [depName, depInfo] of Object.entries(deps)) {
          const nameLower = depName.toLowerCase();
          const version = depInfo.resolved || "0.0.0";
          const isDirect = depInfo.type === "Direct" || directDeps.has(nameLower);
          const depId = `nuget:${nameLower}@${version}`;

          if (!nodeMap.has(nameLower)) {
            const node: DependencyNode = {
              id: depId,
              name: depName,
              version,
              ecosystem: "nuget",
              dependencyType: "production",
              isDirect,
              isTransitive: !isDirect,
              parents: [],
              children: [],
              depth: isDirect ? 1 : 2,
              packageManager: "nuget",
              manifest: csprojFile,
            };
            nodes.push(node);
            nodeMap.set(nameLower, node);
          }
        }
      }

      // Connect direct dependencies to root, and build parents/children relationships where simple/practical
      for (const node of nodes) {
        if (node.id === rootId) continue;
        if (node.isDirect) {
          node.parents.push(rootId);
          nodes[0].children.push(node.id);
          edges.push({
            source: rootId,
            target: node.id,
          });
        }
      }
    }

    // Fill in root's children if we didn't have lockfile
    if (!fs.existsSync(lockfilePath)) {
      const rootNode = nodes[0];
      rootNode.children = nodes.slice(1).map((n) => n.id);
    }

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "dotnet",
      packageManager: "nuget",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }
}
