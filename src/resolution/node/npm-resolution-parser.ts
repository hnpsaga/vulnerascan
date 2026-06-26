import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";
import { parse as parseYaml } from "yaml";
import yarnLockfile from "@yarnpkg/lockfile";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
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

interface YarnParsed {
  type: string;
  object: Record<string, unknown>;
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

export class NodeResolutionParser implements ResolutionParser {
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

    // 1. Parse package.json (or check for workspaces / packageManager)
    let rootName = "app";
    let rootVersion = "0.0.0";
    let rootDependencies: Record<string, string> = {};
    let rootDevDependencies: Record<string, string> = {};
    let rootOptionalDependencies: Record<string, string> = {};
    let rootPeerDependencies: Record<string, string> = {};
    let packageManager = "npm";

    try {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf8");
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;
      rootName = packageJson.name || "app";
      rootVersion = packageJson.version || "0.0.0";
      rootDependencies = packageJson.dependencies || {};
      rootDevDependencies = packageJson.devDependencies || {};
      rootOptionalDependencies = packageJson.optionalDependencies || {};
      rootPeerDependencies = packageJson.peerDependencies || {};

      if (packageJson.packageManager && typeof packageJson.packageManager === "string") {
        if (packageJson.packageManager.startsWith("pnpm")) packageManager = "pnpm";
        else if (packageJson.packageManager.startsWith("yarn")) packageManager = "yarn";
      }
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${(error as Error).message}`);
    }

    // 2. Locate lockfile
    let lockfilePath = "";
    let detectedPM = packageManager;

    const possibleLocks = [
      { name: "pnpm-lock.yaml", pm: "pnpm" },
      { name: "yarn.lock", pm: "yarn" },
      { name: "package-lock.json", pm: "npm" },
      { name: "npm-shrinkwrap.json", pm: "npm" },
    ];

    if (resolutionSource === "existing-lockfile") {
      for (const lock of possibleLocks) {
        const fullPath = path.join(manifestsDir, lock.name);
        if (fs.existsSync(fullPath)) {
          lockfilePath = fullPath;
          detectedPM = lock.pm;
          break;
        }
      }
      if (!lockfilePath) {
        throw new Error("No lockfile found in manifests directory");
      }
    } else {
      const generatedDir = path.join(workspacePath, "generated");
      for (const lock of possibleLocks) {
        const fullPath = path.join(generatedDir, lock.name);
        if (fs.existsSync(fullPath)) {
          lockfilePath = fullPath;
          detectedPM = lock.pm;
          break;
        }
      }
      if (!lockfilePath) {
        throw new Error("No generated lockfile found in generated directory");
      }
    }

    // 3. Parse lockfile & build Graph
    const packagesMap = new Map<string, PackInfo>();
    const packagesLock: Record<string, LockfilePackageEntry> = {};

    if (detectedPM === "pnpm") {
      await this.parsePnpmLockfile(lockfilePath, packagesMap, packagesLock);
    } else if (detectedPM === "yarn") {
      await this.parseYarnLockfile(lockfilePath, packagesMap, packagesLock);
    } else {
      await this.parseNpmLockfile(lockfilePath, packagesMap, packagesLock);
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
      depth: 0,
      packageManager: detectedPM,
      manifest: "package.json",
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
      depth: number;
    }
    const queue: QueueItem[] = [];

    // Push direct dependencies
    const pushDirect = (
      deps: Record<string, string>,
      type: "production" | "development" | "optional" | "peer",
    ): void => {
      for (const depName of Object.keys(deps)) {
        const childPath = this.resolveDependencyPath("", depName, packagesLock, detectedPM);
        if (childPath) {
          const pkg = packagesMap.get(childPath)!;
          const depNodeId = `npm:${pkg.name}@${pkg.version}`;
          queue.push({ path: childPath, nodeId: depNodeId, type, depth: 1 });
          addEdge(rootId, depNodeId);
        }
      }
    };

    pushDirect(rootDependencies, "production");
    pushDirect(rootDevDependencies, "development");
    pushDirect(rootOptionalDependencies, "optional");
    pushDirect(rootPeerDependencies, "peer");

    const visitedPathsMaxType = new Map<
      string,
      "production" | "development" | "optional" | "peer"
    >();

    while (queue.length > 0) {
      const { path: currentPath, nodeId, type, depth } = queue.shift()!;
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
          depth,
          packageManager: detectedPM,
          manifest: "package.json",
        };
        nodesMap.set(nodeId, node);
      } else {
        node.dependencyType = getMorePrecedentType(node.dependencyType, type);
        node.depth = Math.min(node.depth, depth);
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
          const childPath = this.resolveDependencyPath(
            currentPath,
            depName,
            packagesLock,
            detectedPM,
          );
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
              depth: depth + 1,
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
      packageManager: detectedPM,
      nodes: sortedNodes,
      edges: sortedEdges,
    };

    // Calculate total dependencies (unique dependencies resolved in the graph excluding root itself)
    const totalDependenciesCount = Math.max(0, nodesMap.size - 1);

    // Calculate direct dependencies count
    const directDeps = new Set<string>();
    const depFields = [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ];
    const packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent) as PackageJson;
    for (const field of depFields) {
      const deps = packageJson[field];
      if (deps && typeof deps === "object") {
        Object.keys(deps).forEach((dep) => directDeps.add(dep));
      }
    }
    const directDependenciesCount = directDeps.size;

    return {
      directDependencies: directDependenciesCount,
      totalDependencies: totalDependenciesCount,
      graph: dependencyGraph,
    };
  }

  // --- NPM Locker Parser ---
  private async parseNpmLockfile(
    lockfilePath: string,
    packagesMap: Map<string, PackInfo>,
    packagesLock: Record<string, LockfilePackageEntry>,
  ): Promise<void> {
    const lockfileContent = await fs.promises.readFile(lockfilePath, "utf8");
    const lockfile = JSON.parse(lockfileContent) as {
      packages?: Record<string, LockfilePackageEntry>;
      dependencies?: Record<string, LockfilePackageEntry>;
    };

    if (lockfile.packages) {
      for (const [key, pkg] of Object.entries(lockfile.packages)) {
        if (key === "") continue;

        let targetPkg = pkg;
        if (pkg.link && pkg.resolved && lockfile.packages[pkg.resolved]) {
          targetPkg = lockfile.packages[pkg.resolved];
        }

        const name = targetPkg.name || this.getPackageNameFromPath(key);
        const version = targetPkg.version || "0.0.0";
        packagesMap.set(key, {
          name,
          version,
          dependencies: targetPkg.dependencies || {},
          devDependencies: targetPkg.devDependencies || {},
          optionalDependencies: targetPkg.optionalDependencies || {},
          peerDependencies: targetPkg.peerDependencies || {},
          dev: targetPkg.dev,
          optional: targetPkg.optional,
          peer: targetPkg.peer,
        });

        packagesLock[key] = targetPkg;
      }
    } else if (lockfile.dependencies) {
      this.flattenV1Dependencies(lockfile.dependencies, "", packagesMap, packagesLock);
    } else {
      throw new Error("Invalid lockfile format: missing both packages and dependencies fields");
    }
  }

  private flattenV1Dependencies(
    currentDeps: Record<string, LockfilePackageEntry>,
    parentPath: string,
    packagesMap: Map<string, PackInfo>,
    packagesLock: Record<string, LockfilePackageEntry>,
  ): void {
    for (const [name, dep] of Object.entries(currentDeps)) {
      const currentPath =
        parentPath === "" ? `node_modules/${name}` : `${parentPath}/node_modules/${name}`;

      const version = dep.version || "0.0.0";
      const dependencies: Record<string, string> = (dep.requires as Record<string, string>) || {};

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
        this.flattenV1Dependencies(
          dep.dependencies as unknown as Record<string, LockfilePackageEntry>,
          currentPath,
          packagesMap,
          packagesLock,
        );
      }
    }
  }

  // --- PNPM Locker Parser ---
  private async parsePnpmLockfile(
    lockfilePath: string,
    packagesMap: Map<string, PackInfo>,
    packagesLock: Record<string, LockfilePackageEntry>,
  ): Promise<void> {
    const content = await fs.promises.readFile(lockfilePath, "utf8");
    const parsed = parseYaml(content) as Record<string, unknown>;

    if (!parsed) {
      throw new Error("Failed to parse pnpm-lock.yaml as YAML");
    }

    // pnpm lockfile version 6/9 structures differ:
    const packages = (parsed.packages as Record<string, unknown>) || {};
    const snapshots =
      (parsed.snapshots as Record<string, Record<string, Record<string, string>>>) || {};

    // Standardize packages maps.
    for (const [key, pkg] of Object.entries(packages)) {
      const { name, version } = this.parsePnpmPackageKey(key);

      const pkgData = pkg as Record<string, unknown>;
      const snap = snapshots[key] || (pkgData as unknown as Record<string, Record<string, string>>);

      const info: PackInfo = {
        name,
        version,
        dependencies: snap?.dependencies || {},
        devDependencies: snap?.devDependencies || {},
        optionalDependencies: snap?.optionalDependencies || {},
        peerDependencies: snap?.peerDependencies || {},
      };

      packagesMap.set(key, info);
      packagesLock[key] = {
        version,
        dependencies: info.dependencies,
        devDependencies: info.devDependencies,
        optionalDependencies: info.optionalDependencies,
        peerDependencies: info.peerDependencies,
      };
    }

    // Process importers to map root direct dependencies
    const importers =
      (parsed.importers as Record<string, Record<string, Record<string, unknown>>>) || {};
    const rootImporter = importers["."];
    if (rootImporter) {
      const mapImporterDeps = (deps: Record<string, unknown>): void => {
        if (!deps) return;
        for (const [name, val] of Object.entries(deps)) {
          const version =
            typeof val === "object" && val !== null
              ? (val as Record<string, string>).version
              : String(val);
          // Look up in packagesMap
          let foundKey = "";
          for (const [key, pkg] of packagesMap.entries()) {
            if (pkg.name === name && pkg.version === version) {
              foundKey = key;
              break;
            }
          }
          if (foundKey) {
            const pathKey = `node_modules/${name}`;
            const pkgInfo = packagesMap.get(foundKey)!;
            packagesMap.set(pathKey, pkgInfo);
            packagesLock[pathKey] = packagesLock[foundKey];
          }
        }
      };
      if (rootImporter.dependencies) mapImporterDeps(rootImporter.dependencies);
      if (rootImporter.devDependencies) mapImporterDeps(rootImporter.devDependencies);
      if (rootImporter.optionalDependencies) mapImporterDeps(rootImporter.optionalDependencies);
    }
  }

  private parsePnpmPackageKey(key: string): { name: string; version: string } {
    let clean = key.startsWith("/") ? key.substring(1) : key;
    const parenIndex = clean.indexOf("(");
    if (parenIndex !== -1) {
      clean = clean.substring(0, parenIndex);
    }
    const lastAt = clean.lastIndexOf("@");
    if (lastAt !== -1) {
      const name = clean.substring(0, lastAt);
      const version = clean.substring(lastAt + 1);
      return { name, version };
    }
    return { name: clean, version: "0.0.0" };
  }

  // --- Yarn Locker Parser ---
  private async parseYarnLockfile(
    lockfilePath: string,
    packagesMap: Map<string, PackInfo>,
    packagesLock: Record<string, LockfilePackageEntry>,
  ): Promise<void> {
    const content = await fs.promises.readFile(lockfilePath, "utf8");
    let parsed: Record<string, unknown>;

    if (content.includes("__metadata")) {
      // Yarn Berry (v2+ YAML lockfile)
      parsed = parseYaml(content) as Record<string, unknown>;
      for (const [key, pkg] of Object.entries(parsed)) {
        if (key === "__metadata") continue;
        const pkgData = pkg as Record<string, unknown>;

        const firstKey = key.split(",")[0].trim();
        const { name } = this.parseYarnBerryPackageKey(firstKey);
        const version = (pkgData.version as string) || "0.0.0";

        const info: PackInfo = {
          name,
          version,
          dependencies: (pkgData.dependencies as Record<string, string>) || {},
          devDependencies: {},
          optionalDependencies: (pkgData.optionalDependencies as Record<string, string>) || {},
          peerDependencies: (pkgData.peerDependencies as Record<string, string>) || {},
        };

        packagesMap.set(key, info);
        packagesLock[key] = {
          version,
          dependencies: info.dependencies,
          devDependencies: info.devDependencies,
          optionalDependencies: info.optionalDependencies,
          peerDependencies: info.peerDependencies,
        };
      }
    } else {
      // Yarn Classic
      const res = yarnLockfile.parse(content) as YarnParsed;
      if (res.type !== "success") {
        throw new Error("Failed to parse yarn.lock Classic file");
      }
      parsed = res.object;
      for (const [key, pkg] of Object.entries(parsed)) {
        const pkgData = pkg as Record<string, unknown>;
        const firstKey = key.split(",")[0].trim();
        const lastAt = firstKey.lastIndexOf("@");
        const name = lastAt !== -1 && lastAt !== 0 ? firstKey.substring(0, lastAt) : firstKey;
        const version = (pkgData.version as string) || "0.0.0";

        const info: PackInfo = {
          name,
          version,
          dependencies: (pkgData.dependencies as Record<string, string>) || {},
          devDependencies: {},
          optionalDependencies: (pkgData.optionalDependencies as Record<string, string>) || {},
          peerDependencies: {},
        };

        packagesMap.set(key, info);
        packagesLock[key] = {
          version,
          dependencies: info.dependencies,
          devDependencies: info.devDependencies,
          optionalDependencies: info.optionalDependencies,
          peerDependencies: info.peerDependencies,
        };
      }
    }
  }

  private parseYarnBerryPackageKey(key: string): { name: string; version: string } {
    const clean = key.replace(/^"|"$/g, "");
    const npmIndex = clean.indexOf("@npm:");
    if (npmIndex !== -1) {
      const name = clean.substring(0, npmIndex);
      const version = clean.substring(npmIndex + 5);
      return { name, version };
    }
    const lastAt = clean.lastIndexOf("@");
    if (lastAt !== -1 && lastAt !== 0) {
      const name = clean.substring(0, lastAt);
      const version = clean.substring(lastAt + 1);
      return { name, version };
    }
    return { name: clean, version: "0.0.0" };
  }

  private resolveDependencyPath(
    parentPath: string,
    depName: string,
    packages: Record<string, LockfilePackageEntry>,
    packageManager: string,
  ): string | null {
    if (packageManager === "npm") {
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
    } else if (packageManager === "pnpm") {
      const nodeModulesPath = `node_modules/${depName}`;
      if (packages[nodeModulesPath]) return nodeModulesPath;

      for (const key of Object.keys(packages)) {
        const namePart = this.parsePnpmPackageKey(key).name;
        if (namePart === depName) {
          return key;
        }
      }
      return null;
    } else {
      // Yarn
      for (const key of Object.keys(packages)) {
        const firstKey = key.split(",")[0].trim();
        const lastAt = firstKey.lastIndexOf("@");
        const name = lastAt !== -1 && lastAt !== 0 ? firstKey.substring(0, lastAt) : firstKey;
        const berryName = this.parseYarnBerryPackageKey(firstKey).name;
        if (name === depName || berryName === depName) {
          return key;
        }
      }
      return null;
    }
  }

  private getPackageNameFromPath(packagePath: string): string {
    const parts = packagePath.split("node_modules/");
    return parts[parts.length - 1];
  }
}

export { NodeResolutionParser as NpmResolutionParser };
