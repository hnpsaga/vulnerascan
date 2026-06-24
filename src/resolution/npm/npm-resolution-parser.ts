import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface LockfileV1Dep {
  version: string;
  requires?: Record<string, string>;
  dependencies?: Record<string, LockfileV1Dep>;
  dev?: boolean;
  optional?: boolean;
  peer?: boolean;
  [key: string]: unknown;
}

interface LockfilePackageEntry {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dev?: boolean;
  optional?: boolean;
  peer?: boolean;
  link?: boolean;
  resolved?: string;
  [key: string]: unknown;
}

interface Lockfile {
  packages?: Record<string, LockfilePackageEntry>;
  dependencies?: Record<string, LockfileV1Dep>;
  [key: string]: unknown;
}

interface PackInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  dev?: boolean;
  optional?: boolean;
  peer?: boolean;
}

const TYPE_PRECEDENCE = {
  production: 4,
  development: 3,
  optional: 2,
  peer: 1,
};

function getMorePrecedentType(
  type1: "production" | "development" | "optional" | "peer",
  type2: "production" | "development" | "optional" | "peer",
): "production" | "development" | "optional" | "peer" {
  return TYPE_PRECEDENCE[type1] >= TYPE_PRECEDENCE[type2] ? type1 : type2;
}

export class NpmResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const packageJsonPath = path.join(manifestsDir, "package.json");

    try {
      await fs.promises.access(packageJsonPath);
    } catch {
      throw new Error(`package.json not found in manifests: ${packageJsonPath}`);
    }

    // 1. Parse package.json
    let rootName = "app";
    let rootVersion = "0.0.0";
    let rootDependencies: Record<string, string> = {};
    let rootDevDependencies: Record<string, string> = {};
    let rootOptionalDependencies: Record<string, string> = {};
    let rootPeerDependencies: Record<string, string> = {};
    let directDependenciesCount = 0;

    try {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf8");
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;
      rootName = packageJson.name || "app";
      rootVersion = packageJson.version || "0.0.0";
      rootDependencies = packageJson.dependencies || {};
      rootDevDependencies = packageJson.devDependencies || {};
      rootOptionalDependencies = packageJson.optionalDependencies || {};
      rootPeerDependencies = packageJson.peerDependencies || {};

      const directDeps = new Set<string>();
      const depFields = [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ];
      for (const field of depFields) {
        const deps = packageJson[field];
        if (deps && typeof deps === "object") {
          Object.keys(deps).forEach((dep) => directDeps.add(dep));
        }
      }
      directDependenciesCount = directDeps.size;
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${(error as Error).message}`);
    }

    // 2. Locate lockfile
    let lockfilePath = "";
    if (resolutionSource === "existing-lockfile") {
      const packageLockPath = path.join(manifestsDir, "package-lock.json");
      const shrinkwrapPath = path.join(manifestsDir, "npm-shrinkwrap.json");
      if (fs.existsSync(packageLockPath)) {
        lockfilePath = packageLockPath;
      } else if (fs.existsSync(shrinkwrapPath)) {
        lockfilePath = shrinkwrapPath;
      } else {
        throw new Error("No lockfile or shrinkwrap found in manifests directory");
      }
    } else {
      const generatedLockPath = path.join(workspacePath, "generated", "package-lock.json");
      if (fs.existsSync(generatedLockPath)) {
        lockfilePath = generatedLockPath;
      } else {
        throw new Error("No generated lockfile found in generated directory");
      }
    }

    // 3. Parse lockfile & build Graph
    let lockfile: Lockfile;
    try {
      const lockfileContent = await fs.promises.readFile(lockfilePath, "utf8");
      lockfile = JSON.parse(lockfileContent) as Lockfile;
    } catch (error) {
      throw new Error(`Failed to parse lockfile at ${lockfilePath}: ${(error as Error).message}`);
    }

    let packagesLock: Record<string, LockfilePackageEntry> = {};
    const packagesMap = new Map<string, PackInfo>();

    if (lockfile.packages) {
      packagesLock = lockfile.packages;
      for (const [key, pkg] of Object.entries(lockfile.packages)) {
        if (key === "") continue;

        let targetPkg = pkg;
        if (pkg.link && pkg.resolved && lockfile.packages[pkg.resolved]) {
          targetPkg = lockfile.packages[pkg.resolved];
        }

        const name = targetPkg.name || pkg.name || this.getPackageNameFromPath(key);
        const version = targetPkg.version || pkg.version || "0.0.0";
        packagesMap.set(key, {
          name,
          version,
          dependencies: targetPkg.dependencies || pkg.dependencies || {},
          devDependencies: targetPkg.devDependencies || pkg.devDependencies || {},
          optionalDependencies: targetPkg.optionalDependencies || pkg.optionalDependencies || {},
          peerDependencies: targetPkg.peerDependencies || pkg.peerDependencies || {},
          dev: targetPkg.dev || pkg.dev,
          optional: targetPkg.optional || pkg.optional,
          peer: targetPkg.peer || pkg.peer,
        });
      }
    } else if (lockfile.dependencies) {
      this.flattenV1Dependencies(lockfile.dependencies, "", packagesMap, packagesLock);
    } else {
      throw new Error("Invalid lockfile format: missing both packages and dependencies fields");
    }

    // Graph Construction
    const rootId = `npm:${rootName}@${rootVersion}`;
    const nodesMap = new Map<string, DependencyNode>();

    // Add root node
    nodesMap.set(rootId, {
      id: rootId,
      name: rootName,
      version: rootVersion,
      ecosystem: "npm",
      dependencyType: "production",
      isDirect: false,
      isTransitive: false,
      parents: [],
      children: [],
    });

    const edgesList: DependencyEdge[] = [];
    const edgesSet = new Set<string>();

    function addEdge(source: string, target: string): void {
      const key = `${source}->${target}`;
      if (!edgesSet.has(key)) {
        edgesSet.add(key);
        edgesList.push({ source, target });
      }
    }

    interface QueueItem {
      path: string;
      nodeId: string;
      type: "production" | "development" | "optional" | "peer";
    }
    const queue: QueueItem[] = [];

    // Push direct dependencies
    for (const depName of Object.keys(rootDependencies)) {
      const childPath = this.resolveDependencyPath("", depName, packagesLock);
      if (childPath) {
        const pkg = packagesMap.get(childPath)!;
        const depNodeId = `npm:${pkg.name}@${pkg.version}`;
        queue.push({ path: childPath, nodeId: depNodeId, type: "production" });
        addEdge(rootId, depNodeId);
      }
    }

    for (const depName of Object.keys(rootDevDependencies)) {
      const childPath = this.resolveDependencyPath("", depName, packagesLock);
      if (childPath) {
        const pkg = packagesMap.get(childPath)!;
        const depNodeId = `npm:${pkg.name}@${pkg.version}`;
        queue.push({ path: childPath, nodeId: depNodeId, type: "development" });
        addEdge(rootId, depNodeId);
      }
    }

    for (const depName of Object.keys(rootOptionalDependencies)) {
      const childPath = this.resolveDependencyPath("", depName, packagesLock);
      if (childPath) {
        const pkg = packagesMap.get(childPath)!;
        const depNodeId = `npm:${pkg.name}@${pkg.version}`;
        queue.push({ path: childPath, nodeId: depNodeId, type: "optional" });
        addEdge(rootId, depNodeId);
      }
    }

    for (const depName of Object.keys(rootPeerDependencies)) {
      const childPath = this.resolveDependencyPath("", depName, packagesLock);
      if (childPath) {
        const pkg = packagesMap.get(childPath)!;
        const depNodeId = `npm:${pkg.name}@${pkg.version}`;
        queue.push({ path: childPath, nodeId: depNodeId, type: "peer" });
        addEdge(rootId, depNodeId);
      }
    }

    const visitedPathsMaxType = new Map<
      string,
      "production" | "development" | "optional" | "peer"
    >();

    while (queue.length > 0) {
      const { path: currentPath, nodeId, type } = queue.shift()!;
      const pkg = packagesMap.get(currentPath)!;

      let node = nodesMap.get(nodeId);
      if (!node) {
        node = {
          id: nodeId,
          name: pkg.name,
          version: pkg.version,
          ecosystem: "npm",
          dependencyType: type,
          isDirect: false,
          isTransitive: false,
          parents: [],
          children: [],
        };
        nodesMap.set(nodeId, node);
      } else {
        node.dependencyType = getMorePrecedentType(node.dependencyType, type);
      }

      const prevMaxType = visitedPathsMaxType.get(currentPath);
      const shouldTraverse = !prevMaxType || TYPE_PRECEDENCE[type] > TYPE_PRECEDENCE[prevMaxType];

      if (shouldTraverse) {
        visitedPathsMaxType.set(currentPath, type);

        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.optionalDependencies,
          ...pkg.peerDependencies,
        };

        for (const depName of Object.keys(allDeps)) {
          const childPath = this.resolveDependencyPath(currentPath, depName, packagesLock);
          if (childPath) {
            const childPkg = packagesMap.get(childPath)!;
            const childNodeId = `npm:${childPkg.name}@${childPkg.version}`;

            let childType = type;
            if (pkg.optionalDependencies && depName in pkg.optionalDependencies) {
              childType = getMorePrecedentType(childType, "optional");
            }
            if (pkg.peerDependencies && depName in pkg.peerDependencies) {
              childType = getMorePrecedentType(childType, "peer");
            }

            addEdge(nodeId, childNodeId);
            queue.push({
              path: childPath,
              nodeId: childNodeId,
              type: childType,
            });
          }
        }
      }
    }

    // Set parent/child references and flags
    for (const edge of edgesList) {
      const sourceNode = nodesMap.get(edge.source);
      const targetNode = nodesMap.get(edge.target);

      if (sourceNode && targetNode) {
        if (!sourceNode.children.includes(edge.target)) {
          sourceNode.children.push(edge.target);
        }
        if (!targetNode.parents.includes(edge.source)) {
          targetNode.parents.push(edge.source);
        }
      }

      if (edge.source === rootId) {
        if (targetNode) targetNode.isDirect = true;
      } else {
        if (targetNode) targetNode.isTransitive = true;
      }
    }

    // Sort arrays inside nodes for deterministic outputs
    for (const node of nodesMap.values()) {
      node.parents.sort();
      node.children.sort();
    }

    // Prepare sorted list of nodes
    const sortedNodes = Array.from(nodesMap.values()).sort((a, b) => a.id.localeCompare(b.id));

    // Sort edges
    const sortedEdges = edgesList.sort((a, b) => {
      const srcComp = a.source.localeCompare(b.source);
      if (srcComp !== 0) return srcComp;
      return a.target.localeCompare(b.target);
    });

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "node",
      packageManager: "npm",
      nodes: sortedNodes,
      edges: sortedEdges,
    };

    // Calculate total dependencies (unique dependencies resolved in the graph excluding root itself)
    const totalDependenciesCount = Math.max(0, nodesMap.size - 1);

    return {
      directDependencies: directDependenciesCount,
      totalDependencies: totalDependenciesCount,
      graph: dependencyGraph,
    };
  }

  private flattenV1Dependencies(
    currentDeps: Record<string, LockfileV1Dep>,
    parentPath: string,
    packagesMap: Map<string, PackInfo>,
    packagesLock: Record<string, LockfilePackageEntry>,
  ): void {
    for (const [name, dep] of Object.entries(currentDeps)) {
      const currentPath =
        parentPath === "" ? `node_modules/${name}` : `${parentPath}/node_modules/${name}`;

      const version = dep.version || "0.0.0";
      const dependencies: Record<string, string> = dep.requires || {};

      packagesMap.set(currentPath, {
        name,
        version,
        dependencies,
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        dev: dep.dev,
        optional: dep.optional,
        peer: dep.peer,
      });

      packagesLock[currentPath] = {
        version,
        dependencies,
        dev: dep.dev,
        optional: dep.optional,
        peer: dep.peer,
      };

      if (dep.dependencies) {
        this.flattenV1Dependencies(dep.dependencies, currentPath, packagesMap, packagesLock);
      }
    }
  }

  private resolveDependencyPath(
    parentPath: string,
    depName: string,
    packages: Record<string, LockfilePackageEntry>,
  ): string | null {
    if (parentPath === "") {
      const targetPath = `node_modules/${depName}`;
      if (packages[targetPath]) return targetPath;
      return null;
    }

    const segments = parentPath.split("/");
    const currentSegments = [...segments];
    while (currentSegments.length > 0) {
      const candidatePath = [...currentSegments, "node_modules", depName].join("/");
      if (packages[candidatePath]) {
        return candidatePath;
      }
      if (
        currentSegments.length >= 2 &&
        currentSegments[currentSegments.length - 2] === "node_modules"
      ) {
        currentSegments.splice(currentSegments.length - 2, 2);
      } else {
        break;
      }
    }
    const topLevelPath = `node_modules/${depName}`;
    if (packages[topLevelPath]) {
      return topLevelPath;
    }
    return null;
  }

  private getPackageNameFromPath(packagePath: string): string {
    const parts = packagePath.split("node_modules/");
    return parts[parts.length - 1];
  }
}
