import { ResolutionParser } from "../interfaces.js";
import { DependencySummary } from "../models/dependency-summary.js";
import { DependencyGraph, DependencyNode, DependencyEdge } from "../models/dependency-graph.js";
import path from "path";
import fs from "fs";
import { parse as parseToml } from "smol-toml";

interface PoetryPackage {
  name: string;
  version: string;
  category?: string;
  dependencies?: Record<string, string>;
}

interface PoetryLock {
  package?: PoetryPackage[];
}

interface PipenvPackageInfo {
  version?: string;
}

interface PipenvLock {
  default?: Record<string, PipenvPackageInfo>;
  develop?: Record<string, PipenvPackageInfo>;
}

export class PythonResolutionParser implements ResolutionParser {
  async parse(
    workspacePath: string,
    _resolutionSource: "existing-lockfile" | "generated-lockfile",
  ): Promise<DependencySummary> {
    const manifestsDir = path.join(workspacePath, "manifests");

    // Check files in order of preference
    const poetryLockPath = path.join(manifestsDir, "poetry.lock");
    const pipfileLockPath = path.join(manifestsDir, "Pipfile.lock");
    const requirementsTxtPath = path.join(manifestsDir, "requirements.txt");
    const pyprojectTomlPath = path.join(manifestsDir, "pyproject.toml");

    if (fs.existsSync(poetryLockPath)) {
      return this.parsePoetry(manifestsDir);
    } else if (fs.existsSync(pipfileLockPath)) {
      return this.parsePipenv(manifestsDir);
    } else if (fs.existsSync(requirementsTxtPath)) {
      return this.parseRequirementsTxt(manifestsDir);
    } else if (fs.existsSync(pyprojectTomlPath)) {
      return this.parsePyprojectToml(manifestsDir);
    } else {
      throw new Error("No Python dependency files found to parse.");
    }
  }

  private async parseRequirementsTxt(manifestsDir: string): Promise<DependencySummary> {
    const filePath = path.join(manifestsDir, "requirements.txt");
    const content = await fs.promises.readFile(filePath, "utf8");

    const rootId = "pip:root@1.0.0";
    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: "root",
        version: "1.0.0",
        ecosystem: "pypi",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "pip",
        manifest: "requirements.txt",
      },
    ];
    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();

    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip empty lines, comments or installer flags
      if (!line || line.startsWith("#") || line.startsWith("-")) {
        continue;
      }

      // requirements.txt constraints: package==version, package>=version, etc.
      // We look for common separators: ==, >=, <=, >, <, ~=
      const match = line.split(/[=<>~]+/);
      if (match.length >= 1) {
        const name = match[0].trim();
        const version = (match[1] || "0.0.0").trim().split(/\s+/)[0]; // strip comments at end of line if any
        if (name) {
          const depId = `pip:${name.toLowerCase()}@${version}`;
          directDeps.add(name.toLowerCase());

          nodes.push({
            id: depId,
            name: name,
            version: version,
            ecosystem: "pypi",
            dependencyType: "production",
            isDirect: true,
            isTransitive: false,
            parents: [rootId],
            children: [],
            depth: 1,
            packageManager: "pip",
            manifest: "requirements.txt",
          });

          edges.push({
            source: rootId,
            target: depId,
          });
        }
      }
    }

    // Connect root to child nodes
    const rootNode = nodes[0];
    rootNode.children = nodes.slice(1).map((n) => n.id);

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "python",
      packageManager: "pip",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }

  private async parsePyprojectToml(manifestsDir: string): Promise<DependencySummary> {
    const filePath = path.join(manifestsDir, "pyproject.toml");
    const content = await fs.promises.readFile(filePath, "utf8");
    const parsed = parseToml(content) as Record<string, unknown>;

    const project = (parsed.project || {}) as Record<string, unknown>;
    const rootName = (project.name as string) || "root";
    const rootVersion = (project.version as string) || "1.0.0";
    const rootId = `pip:${rootName.toLowerCase()}@${rootVersion}`;

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: rootName,
        version: rootVersion,
        ecosystem: "pypi",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "pip",
        manifest: "pyproject.toml",
      },
    ];
    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();

    const dependencies = (project.dependencies as string[]) || [];
    for (const depStr of dependencies) {
      const match = depStr.split(/[=<>~]+/);
      if (match.length >= 1) {
        const name = match[0].trim();
        const version = (match[1] || "0.0.0").trim().split(/\s+/)[0];
        if (name) {
          const depId = `pip:${name.toLowerCase()}@${version}`;
          directDeps.add(name.toLowerCase());

          nodes.push({
            id: depId,
            name: name,
            version: version,
            ecosystem: "pypi",
            dependencyType: "production",
            isDirect: true,
            isTransitive: false,
            parents: [rootId],
            children: [],
            depth: 1,
            packageManager: "pip",
            manifest: "pyproject.toml",
          });

          edges.push({
            source: rootId,
            target: depId,
          });
        }
      }
    }

    // Connect root to child nodes
    const rootNode = nodes[0];
    rootNode.children = nodes.slice(1).map((n) => n.id);

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "python",
      packageManager: "pip",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }

  private async parsePoetry(manifestsDir: string): Promise<DependencySummary> {
    const lockPath = path.join(manifestsDir, "poetry.lock");
    const pyprojectPath = path.join(manifestsDir, "pyproject.toml");

    const lockContent = await fs.promises.readFile(lockPath, "utf8");
    const parsedLock = parseToml(lockContent) as PoetryLock;

    let rootName = "root";
    let rootVersion = "1.0.0";
    const directDeps = new Set<string>();

    if (fs.existsSync(pyprojectPath)) {
      try {
        const pyprojectContent = await fs.promises.readFile(pyprojectPath, "utf8");
        const parsedPyproject = parseToml(pyprojectContent) as Record<string, unknown>;
        const tool = (parsedPyproject.tool || {}) as Record<string, unknown>;
        const poetry = (tool.poetry || {}) as Record<string, unknown>;
        const project = (parsedPyproject.project || {}) as Record<string, unknown>;

        rootName = (poetry.name as string) || (project.name as string) || "root";
        rootVersion = (poetry.version as string) || (project.version as string) || "1.0.0";

        const poetryDeps = (poetry.dependencies || {}) as Record<string, unknown>;
        for (const depName of Object.keys(poetryDeps)) {
          if (depName.toLowerCase() !== "python") {
            directDeps.add(depName.toLowerCase());
          }
        }
        const group = (poetry.group || {}) as Record<string, unknown>;
        const devGroup = (group.dev || {}) as Record<string, unknown>;
        const poetryDevDeps = (devGroup.dependencies || poetry["dev-dependencies"] || {}) as Record<
          string,
          unknown
        >;
        for (const depName of Object.keys(poetryDevDeps)) {
          if (depName.toLowerCase() !== "python") {
            directDeps.add(depName.toLowerCase());
          }
        }
      } catch {
        // use default
      }
    }

    const rootId = `poetry:${rootName.toLowerCase()}@${rootVersion}`;

    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: rootName,
        version: rootVersion,
        ecosystem: "pypi",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "poetry",
        manifest: "poetry.lock",
      },
    ];
    const edges: DependencyEdge[] = [];

    // Parse locked packages
    const packages = parsedLock.package || [];
    const packageMap = new Map<string, DependencyNode>();

    for (const pkg of packages) {
      const name = pkg.name;
      const version = pkg.version;
      const isDirectDep = directDeps.has(name.toLowerCase());
      const category = pkg.category || "main";
      const depType = category === "dev" ? "development" : "production";

      const node: DependencyNode = {
        id: `poetry:${name.toLowerCase()}@${version}`,
        name: name,
        version: version,
        ecosystem: "pypi",
        dependencyType: depType,
        isDirect: isDirectDep,
        isTransitive: !isDirectDep,
        parents: [],
        children: [],
        depth: isDirectDep ? 1 : 2,
        packageManager: "poetry",
        manifest: "poetry.lock",
      };

      packageMap.set(name.toLowerCase(), node);
      nodes.push(node);

      if (isDirectDep) {
        node.parents.push(rootId);
        edges.push({
          source: rootId,
          target: node.id,
        });
      }
    }

    // Now establish dependencies between packages
    for (const pkg of packages) {
      const parentName = pkg.name.toLowerCase();
      const parentNode = packageMap.get(parentName);
      if (!parentNode) continue;

      const deps = pkg.dependencies || {};
      for (const depName of Object.keys(deps)) {
        const childNode = packageMap.get(depName.toLowerCase());
        if (childNode) {
          if (!childNode.parents.includes(parentNode.id)) {
            childNode.parents.push(parentNode.id);
          }
          if (!parentNode.children.includes(childNode.id)) {
            parentNode.children.push(childNode.id);
          }
          edges.push({
            source: parentNode.id,
            target: childNode.id,
          });
        }
      }
    }

    // Ensure root children list is populated
    const rootNode = nodes[0];
    rootNode.children = nodes.filter((n) => n.parents.includes(rootId)).map((n) => n.id);

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "python",
      packageManager: "poetry",
      nodes,
      edges,
    };

    return {
      directDependencies: directDeps.size || nodes.filter((n) => n.isDirect).length,
      totalDependencies: nodes.length - 1,
      graph: dependencyGraph,
    };
  }

  private async parsePipenv(manifestsDir: string): Promise<DependencySummary> {
    const lockPath = path.join(manifestsDir, "Pipfile.lock");
    const content = await fs.promises.readFile(lockPath, "utf8");
    const parsed = JSON.parse(content) as PipenvLock;

    const rootId = "pipenv:root@1.0.0";
    const nodes: DependencyNode[] = [
      {
        id: rootId,
        name: "root",
        version: "1.0.0",
        ecosystem: "pypi",
        dependencyType: "production",
        isDirect: false,
        isTransitive: false,
        parents: [],
        children: [],
        depth: 0,
        packageManager: "pipenv",
        manifest: "Pipfile.lock",
      },
    ];
    const edges: DependencyEdge[] = [];
    const directDeps = new Set<string>();

    const defaultDeps = parsed.default || {};
    const developDeps = parsed.develop || {};

    const addPipenvDeps = (
      deps: Record<string, PipenvPackageInfo>,
      dependencyType: "production" | "development",
    ): void => {
      for (const [name, info] of Object.entries(deps)) {
        const versionStr = info.version || "==0.0.0";
        const version = versionStr.replace(/^[=<>~]+/, "");
        const depId = `pipenv:${name.toLowerCase()}@${version}`;
        directDeps.add(name.toLowerCase());

        nodes.push({
          id: depId,
          name: name,
          version: version,
          ecosystem: "pypi",
          dependencyType,
          isDirect: true,
          isTransitive: false,
          parents: [rootId],
          children: [],
          depth: 1,
          packageManager: "pipenv",
          manifest: "Pipfile.lock",
        });

        edges.push({
          source: rootId,
          target: depId,
        });
      }
    };

    addPipenvDeps(defaultDeps, "production");
    addPipenvDeps(developDeps, "development");

    const rootNode = nodes[0];
    rootNode.children = nodes.slice(1).map((n) => n.id);

    const dependencyGraph: DependencyGraph = {
      schemaVersion: 1,
      projectType: "python",
      packageManager: "pipenv",
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
