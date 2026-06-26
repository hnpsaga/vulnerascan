import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";
import { parse as parseToml } from "smol-toml";

interface CargoPackage {
  name: string;
  version: string;
  source?: string;
  dependencies?: string[];
}

interface CargoLock {
  package?: CargoPackage[];
}

interface CargoDependencyDetails {
  version?: string;
}

interface CargoToml {
  package?: {
    name?: string;
    version?: string;
  };
  dependencies?: Record<string, string | CargoDependencyDetails>;
  "dev-dependencies"?: Record<string, string | CargoDependencyDetails>;
  "build-dependencies"?: Record<string, string | CargoDependencyDetails>;
}

export class RustResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    _resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");
    const cargoTomlPath = path.join(manifestsDir, "Cargo.toml");
    const cargoLockPath = path.join(manifestsDir, "Cargo.lock");

    if (!fs.existsSync(cargoTomlPath)) {
      throw new Error(`Cargo.toml not found in manifests: ${cargoTomlPath}`);
    }

    const tomlContent = await fs.promises.readFile(cargoTomlPath, "utf8");
    const cargoToml = parseToml(tomlContent) as unknown as CargoToml;

    const pkgSection = cargoToml.package || {};
    const rootName = pkgSection.name || "root";
    const rootVersion = pkgSection.version || "0.1.0";
    const rootId = `cargo:${rootName}@${rootVersion}`;

    // Get direct dependency names from Cargo.toml
    const directDeps = new Set<string>();
    const depSections: (keyof CargoToml)[] = [
      "dependencies",
      "dev-dependencies",
      "build-dependencies",
    ];
    for (const section of depSections) {
      const sectionObj = cargoToml[section];
      if (sectionObj && typeof sectionObj === "object") {
        for (const depName of Object.keys(sectionObj)) {
          directDeps.add(depName);
        }
      }
    }

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: rootName,
        version: rootVersion,
        ecosystem: "crates.io",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "cargo",
        manifest: "Cargo.toml",
      },
    ];
    const edges: DependencyEdge[] = [];
    const nodeMap = new Map<string, DependencyNode>();
    nodeMap.set(rootName, nodes[0]);

    if (fs.existsSync(cargoLockPath)) {
      const lockContent = await fs.promises.readFile(cargoLockPath, "utf8");
      const cargoLock = parseToml(lockContent) as CargoLock;
      const packages = cargoLock.package || [];

      // Create nodes for all lockfile packages
      for (const pkg of packages) {
        // Skip the root package if it matches
        if (pkg.name === rootName) {
          nodes[0].version = pkg.version;
          continue;
        }

        const depId = `cargo:${pkg.name}@${pkg.version}`;
        const isDirect = directDeps.has(pkg.name);

        const node: DependencyNode = {
          id: depId,
          name: pkg.name,
          version: pkg.version,
          ecosystem: "crates.io",
          dependencyType: "production",
          isDirect,
          isTransitive: !isDirect,
          parents: [],
          children: [],
          depth: isDirect ? 1 : 2,
          packageManager: "cargo",
          manifest: "Cargo.toml",
        };

        nodes.push(node);
        nodeMap.set(pkg.name, node);
      }

      // Link edges using the dependency lists from the lockfile packages
      for (const pkg of packages) {
        const parentNode = nodeMap.get(pkg.name);
        if (!parentNode) continue;

        if (pkg.dependencies && Array.isArray(pkg.dependencies)) {
          for (const depRaw of pkg.dependencies) {
            // dependencies entry might be just the name e.g., "serde" or with version info e.g., "serde 1.0.130"
            const depName = depRaw.split(" ")[0];
            const childNode = nodeMap.get(depName);

            if (childNode) {
              childNode.parents.push(parentNode.id);
              parentNode.children.push(childNode.id);
              edges.push({
                source: parentNode.id,
                target: childNode.id,
              });
            }
          }
        }
      }

      // Also make sure any direct dependency is connected to the root package if not already
      for (const name of directDeps) {
        const childNode = nodeMap.get(name);
        if (childNode && !childNode.parents.includes(rootId)) {
          childNode.parents.push(rootId);
          nodes[0].children.push(childNode.id);
          edges.push({
            source: rootId,
            target: childNode.id,
          });
        }
      }
    } else {
      // No Cargo.lock, just add direct dependencies from Cargo.toml with dummy or wildcard versions if none
      for (const name of directDeps) {
        const rawDep = cargoToml.dependencies?.[name];
        let versionVal = "0.0.0";
        if (typeof rawDep === "string") {
          versionVal = rawDep;
        } else if (rawDep && typeof rawDep === "object" && "version" in rawDep) {
          const versionProp = rawDep.version;
          if (typeof versionProp === "string") {
            versionVal = versionProp;
          }
        }
        const cleanVersion = versionVal.replace(/[^0-9a-zA-Z.-]/g, "") || "0.0.0";
        const depId = `cargo:${name}@${cleanVersion}`;

        const node: DependencyNode = {
          id: depId,
          name,
          version: cleanVersion,
          ecosystem: "crates.io",
          dependencyType: "production",
          isDirect: true,
          isTransitive: false,
          parents: [rootId],
          children: [],
          depth: 1,
          packageManager: "cargo",
          manifest: "Cargo.toml",
        };

        nodes.push(node);
        nodes[0].children.push(depId);
        edges.push({
          source: rootId,
          target: depId,
        });
      }
    }

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "rust",
      packageManager: "cargo",
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
