import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";

interface ComposerLockPackage {
  name: string;
  version: string;
  require?: Record<string, string>;
  "require-dev"?: Record<string, string>;
}

interface ComposerLock {
  packages?: ComposerLockPackage[];
  "packages-dev"?: ComposerLockPackage[];
}

interface ComposerJson {
  name?: string;
  version?: string;
  require?: Record<string, string>;
  "require-dev"?: Record<string, string>;
}

export class PHPResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    _resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const lockfilePath = path.join(manifestsDir, "composer.lock");
    const jsonPath = path.join(manifestsDir, "composer.json");

    if (!fs.existsSync(jsonPath)) {
      throw new Error("composer.json not found in manifests");
    }

    let composerJson: ComposerJson = {};
    try {
      composerJson = JSON.parse(await fs.promises.readFile(jsonPath, "utf8")) as ComposerJson;
    } catch {
      throw new Error("Invalid composer.json manifest");
    }

    const rootName = composerJson.name || "app";
    const rootVersion = composerJson.version || "1.0.0";
    const rootId = `composer:${rootName}@${rootVersion}`;

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: rootName,
        version: rootVersion,
        ecosystem: "packagist",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "composer",
        manifest: "composer.json",
      },
    ];

    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();

    const rootRequire = composerJson.require || {};
    const rootRequireDev = composerJson["require-dev"] || {};

    const directProdKeys = Object.keys(rootRequire).filter(
      (k) => k !== "php" && !k.startsWith("ext-"),
    );
    const directDevKeys = Object.keys(rootRequireDev).filter(
      (k) => k !== "php" && !k.startsWith("ext-"),
    );

    directProdKeys.forEach((k) => directDeps.add(k.toLowerCase()));
    directDevKeys.forEach((k) => directDeps.add(k.toLowerCase()));

    if (!fs.existsSync(lockfilePath)) {
      // No lockfile: resolve only direct dependencies as reported in composer.json
      // Let's assume version constraints or fallback versions.
      for (const [name, constraint] of Object.entries(rootRequire)) {
        if (name === "php" || name.startsWith("ext-")) continue;
        const normalizedVersion =
          constraint
            .replace(/[\^~>=<]+/g, "")
            .split("||")[0]
            .trim() || "0.0.0";
        const depId = `composer:${name.toLowerCase()}@${normalizedVersion}`;
        nodes.push({
          id: depId,
          name,
          version: normalizedVersion,
          ecosystem: "packagist",
          dependencyType: "production",
          isDirect: true,
          isTransitive: false,
          parents: [rootId],
          children: [],
          depth: 1,
          packageManager: "composer",
          manifest: "composer.json",
        });
        edges.push({ source: rootId, target: depId });
      }

      for (const [name, constraint] of Object.entries(rootRequireDev)) {
        if (name === "php" || name.startsWith("ext-")) continue;
        const normalizedVersion =
          constraint
            .replace(/[\^~>=<]+/g, "")
            .split("||")[0]
            .trim() || "0.0.0";
        const depId = `composer:${name.toLowerCase()}@${normalizedVersion}`;
        nodes.push({
          id: depId,
          name,
          version: normalizedVersion,
          ecosystem: "packagist",
          dependencyType: "development",
          isDirect: true,
          isTransitive: false,
          parents: [rootId],
          children: [],
          depth: 1,
          packageManager: "composer",
          manifest: "composer.json",
        });
        edges.push({ source: rootId, target: depId });
      }

      // Update root children
      nodes[0].children = edges.map((e) => e.target);

      const graph: DependencyGraph = {
        schemaVersion: 1,
        projectType: "php",
        packageManager: "composer",
        nodes,
        edges,
      };

      return {
        directDependencies: directProdKeys.length + directDevKeys.length,
        totalDependencies: nodes.length - 1,
        graph,
      };
    }

    // Lockfile exists: parse lockfile packages
    let lockData: ComposerLock = {};
    try {
      lockData = JSON.parse(await fs.promises.readFile(lockfilePath, "utf8")) as ComposerLock;
    } catch {
      throw new Error("Invalid composer.lock lockfile");
    }

    const allPackages = new Map<
      string,
      ComposerLockPackage & { type: "production" | "development" }
    >();
    (lockData.packages || []).forEach((pkg) => {
      allPackages.set(pkg.name.toLowerCase(), { ...pkg, type: "production" });
    });
    (lockData["packages-dev"] || []).forEach((pkg) => {
      allPackages.set(pkg.name.toLowerCase(), { ...pkg, type: "development" });
    });

    const addedNodes = new Map<string, DependencyNode>();

    // Recursively build the tree/graph starting from direct deps
    const resolveQueue: { name: string; parentId: string; depth: number }[] = [];

    directProdKeys.forEach((name) => {
      resolveQueue.push({ name, parentId: rootId, depth: 1 });
    });
    directDevKeys.forEach((name) => {
      resolveQueue.push({ name, parentId: rootId, depth: 1 });
    });

    while (resolveQueue.length > 0) {
      const { name, parentId, depth } = resolveQueue.shift()!;
      const key = name.toLowerCase();
      const pkgInfo = allPackages.get(key);

      if (!pkgInfo) {
        continue;
      }

      const depId = `composer:${key}@${pkgInfo.version}`;
      let node = addedNodes.get(depId);

      if (!node) {
        const isDirect = parentId === rootId;
        node = {
          id: depId,
          name: pkgInfo.name,
          version: pkgInfo.version,
          ecosystem: "packagist",
          dependencyType: pkgInfo.type,
          isDirect,
          isTransitive: !isDirect,
          parents: [parentId],
          children: [],
          depth,
          packageManager: "composer",
          manifest: "composer.json",
        };
        addedNodes.set(depId, node);
        nodes.push(node);

        // Add transient requires to queue
        const reqs = pkgInfo.require || {};
        Object.keys(reqs).forEach((reqName) => {
          if (reqName === "php" || reqName.startsWith("ext-")) return;
          resolveQueue.push({ name: reqName, parentId: depId, depth: depth + 1 });
        });
      } else {
        if (!node.parents.includes(parentId)) {
          node.parents.push(parentId);
        }
      }

      if (!edges.some((e) => e.source === parentId && e.target === depId)) {
        edges.push({ source: parentId, target: depId });
      }
    }

    // Hook up children fields for all nodes
    nodes.forEach((node) => {
      node.children = edges.filter((e) => e.source === node.id).map((e) => e.target);
    });

    const graph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "php",
      packageManager: "composer",
      nodes,
      edges,
    };

    return {
      directDependencies: directProdKeys.length + directDevKeys.length,
      totalDependencies: nodes.length - 1,
      graph,
    };
  }
}
