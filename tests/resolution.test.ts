import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { DependencyResolutionService } from "../src/resolution/dependency-resolution-service.js";
import { NpmManifestManager } from "../src/resolution/node/npm-manifest-manager.js";
import { NpmLockfileGenerator } from "../src/resolution/node/npm-lockfile-generator.js";
import { NpmResolutionParser } from "../src/resolution/node/npm-resolution-parser.js";
import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import { RunManager } from "../src/workspace/run-manager.js";
import { ProjectType } from "../src/models/project-type.js";
import { ProjectInfo } from "../src/models/project-info.js";
import type {
  DependencyResolutionSuccess,
  DependencyResolutionFailure,
} from "../src/resolution/models/dependency-resolution.js";

const TEST_DIR = join(import.meta.dirname, "tmp-resolution-tests");
const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const CLI_ENTRY = join(import.meta.dirname, "..", "src", "cli.ts");

function runCLI(
  args: string,
  cwd: string,
  envHome: string,
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node --import tsx/esm ${CLI_ENTRY} ${args}`, {
      encoding: "utf-8",
      cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        VULNERASCAN_HOME: envHome,
        VULNERASCAN_TEST_MODE: "true",
        NO_COLOR: "1",
      },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const error = err as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      exitCode: error.status ?? 1,
    };
  }
}

describe("Dependency Resolution Engine", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("NpmManifestManager", () => {
    it("copies package.json and package-lock.json if they exist", async () => {
      const manager = new NpmManifestManager();
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-1");

      await manager.copyManifests(srcDir, workspacePath);

      expect(existsSync(join(workspacePath, "manifests", "package.json"))).toBe(true);
      expect(existsSync(join(workspacePath, "manifests", "package-lock.json"))).toBe(true);
      expect(await manager.hasLockfile(workspacePath)).toBe(true);
    });

    it("copies only package.json if lockfile is missing", async () => {
      const manager = new NpmManifestManager();
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-2");

      await manager.copyManifests(srcDir, workspacePath);

      expect(existsSync(join(workspacePath, "manifests", "package.json"))).toBe(true);
      expect(existsSync(join(workspacePath, "manifests", "package-lock.json"))).toBe(false);
      expect(await manager.hasLockfile(workspacePath)).toBe(false);
    });
  });

  describe("NpmLockfileGenerator", () => {
    it("generates package-lock.json in the generated directory", async () => {
      const manifestManager = new NpmManifestManager();
      const generator = new NpmLockfileGenerator();
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-3");

      await manifestManager.copyManifests(srcDir, workspacePath);
      await generator.generateLockfile(workspacePath);

      expect(existsSync(join(workspacePath, "generated", "package.json"))).toBe(true);
      expect(existsSync(join(workspacePath, "generated", "package-lock.json"))).toBe(true);
    });
  });

  describe("NpmResolutionParser", () => {
    it("parses direct and total dependency counts from existing lockfile", async () => {
      const manifestManager = new NpmManifestManager();
      const parser = new NpmResolutionParser();
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-4");

      await manifestManager.copyManifests(srcDir, workspacePath);
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      // direct: foo, bar = 2
      // total: foo, bar, baz = 3
      expect(summary.directDependencies).toBe(2);
      expect(summary.totalDependencies).toBe(3);
    });

    it("generates a valid schema and resolves node metadata (direct/transitive, ecosystem, type)", async () => {
      const manifestManager = new NpmManifestManager();
      const parser = new NpmResolutionParser();
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspacePath = join(TEST_DIR, "workspace-graph-1");

      await manifestManager.copyManifests(srcDir, workspacePath);
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      expect(summary.graph).toBeDefined();
      const graph = summary.graph!;
      expect(graph.schemaVersion).toBe(1);
      expect(graph.projectType).toBe("node");
      expect(graph.packageManager).toBe("npm");

      // Verify Nodes
      // We expect 4 nodes: root (node-with-lockfile), foo, bar, baz
      expect(graph.nodes.length).toBe(4);

      const rootNode = graph.nodes.find((n) => n.id === "npm:node-with-lockfile@1.0.0")!;
      expect(rootNode).toBeDefined();
      expect(rootNode.name).toBe("node-with-lockfile");
      expect(rootNode.version).toBe("1.0.0");
      expect(rootNode.ecosystem).toBe("npm");
      expect(rootNode.isDirect).toBe(false);
      expect(rootNode.isTransitive).toBe(false);
      expect(rootNode.depth).toBe(0);
      expect(rootNode.packageManager).toBe("npm");
      expect(rootNode.manifest).toBe("package.json");

      const fooNode = graph.nodes.find((n) => n.id === "npm:foo@1.0.0")!;
      expect(fooNode).toBeDefined();
      expect(fooNode.isDirect).toBe(true);
      expect(fooNode.isTransitive).toBe(false);
      expect(fooNode.dependencyType).toBe("production");
      expect(fooNode.parents).toContain(rootNode.id);
      expect(fooNode.depth).toBe(1);
      expect(fooNode.packageManager).toBe("npm");
      expect(fooNode.manifest).toBe("package.json");

      const barNode = graph.nodes.find((n) => n.id === "npm:bar@2.0.0")!;
      expect(barNode).toBeDefined();
      expect(barNode.isDirect).toBe(true);
      expect(barNode.isTransitive).toBe(false);
      expect(barNode.dependencyType).toBe("development"); // bar is in devDependencies
      expect(barNode.depth).toBe(1);
      expect(barNode.packageManager).toBe("npm");
      expect(barNode.manifest).toBe("package.json");

      const bazNode = graph.nodes.find((n) => n.id === "npm:baz@3.0.0")!;
      expect(bazNode).toBeDefined();
      expect(bazNode.isDirect).toBe(false);
      expect(bazNode.isTransitive).toBe(true);
      expect(bazNode.dependencyType).toBe("development"); // baz is a child of bar (dev dep)
      expect(bazNode.parents).toContain(barNode.id);
      expect(bazNode.depth).toBe(2);
      expect(bazNode.packageManager).toBe("npm");
      expect(bazNode.manifest).toBe("package.json");

      // Verify Edges
      expect(graph.edges).toContainEqual({ source: rootNode.id, target: fooNode.id });
      expect(graph.edges).toContainEqual({ source: rootNode.id, target: barNode.id });
      expect(graph.edges).toContainEqual({ source: barNode.id, target: bazNode.id });
    });

    it("handles circular dependencies without infinite loops", async () => {
      const workspacePath = join(TEST_DIR, "workspace-circular");
      const manifestsDir = join(workspacePath, "manifests");
      mkdirSync(manifestsDir, { recursive: true });

      const packageJson = {
        name: "circular-app",
        version: "1.0.0",
        dependencies: {
          a: "^1.0.0",
        },
      };

      const packageLock = {
        name: "circular-app",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": {
            name: "circular-app",
            version: "1.0.0",
            dependencies: {
              a: "^1.0.0",
            },
          },
          "node_modules/a": {
            version: "1.0.0",
            dependencies: {
              b: "^1.0.0",
            },
          },
          "node_modules/b": {
            version: "1.0.0",
            dependencies: {
              a: "^1.0.0",
            },
          },
        },
      };

      writeFileSync(join(manifestsDir, "package.json"), JSON.stringify(packageJson, null, 2));
      writeFileSync(join(manifestsDir, "package-lock.json"), JSON.stringify(packageLock, null, 2));

      const parser = new NpmResolutionParser();
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      expect(summary.totalDependencies).toBe(2); // 'a' and 'b'
      const graph = summary.graph!;
      expect(graph.nodes.length).toBe(3); // root, a, b

      const aNode = graph.nodes.find((n) => n.id === "npm:a@1.0.0")!;
      const bNode = graph.nodes.find((n) => n.id === "npm:b@1.0.0")!;

      expect(aNode.isDirect).toBe(true);
      expect(aNode.isTransitive).toBe(true); // also transitive via b
      expect(bNode.isDirect).toBe(false);
      expect(bNode.isTransitive).toBe(true);

      // circular links
      expect(aNode.children).toContain(bNode.id);
      expect(bNode.children).toContain(aNode.id);
      expect(graph.edges).toContainEqual({ source: aNode.id, target: bNode.id });
      expect(graph.edges).toContainEqual({ source: bNode.id, target: aNode.id });
    });

    it("eliminates duplicates and resolves nested dependency chains", async () => {
      const workspacePath = join(TEST_DIR, "workspace-duplicate");
      const manifestsDir = join(workspacePath, "manifests");
      mkdirSync(manifestsDir, { recursive: true });

      const packageJson = {
        name: "duplicate-app",
        version: "1.0.0",
        dependencies: {
          a: "^1.0.0",
          b: "^1.0.0",
        },
      };

      const packageLock = {
        name: "duplicate-app",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": {
            name: "duplicate-app",
            version: "1.0.0",
            dependencies: {
              a: "^1.0.0",
              b: "^1.0.0",
            },
          },
          "node_modules/a": {
            version: "1.0.0",
            dependencies: {
              c: "^1.0.0",
            },
          },
          "node_modules/b": {
            version: "1.0.0",
            dependencies: {
              c: "^1.0.0",
            },
          },
          "node_modules/c": {
            version: "1.0.0",
          },
        },
      };

      writeFileSync(join(manifestsDir, "package.json"), JSON.stringify(packageJson, null, 2));
      writeFileSync(join(manifestsDir, "package-lock.json"), JSON.stringify(packageLock, null, 2));

      const parser = new NpmResolutionParser();
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      expect(summary.totalDependencies).toBe(3); // a, b, c
      const graph = summary.graph!;
      expect(graph.nodes.length).toBe(4); // root, a, b, c

      const cNode = graph.nodes.find((n) => n.id === "npm:c@1.0.0")!;
      expect(cNode).toBeDefined();
      expect(cNode.parents).toContain("npm:a@1.0.0");
      expect(cNode.parents).toContain("npm:b@1.0.0");
      expect(cNode.isDirect).toBe(false);
      expect(cNode.isTransitive).toBe(true);
    });

    it("handles workspace monorepo link structures", async () => {
      const workspacePath = join(TEST_DIR, "workspace-monorepo");
      const manifestsDir = join(workspacePath, "manifests");
      mkdirSync(manifestsDir, { recursive: true });

      const packageJson = {
        name: "monorepo-root",
        version: "1.0.0",
        dependencies: {
          "pkg-b": "^1.0.0",
        },
      };

      const packageLock = {
        name: "monorepo-root",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": {
            name: "monorepo-root",
            version: "1.0.0",
            dependencies: {
              "pkg-b": "^1.0.0",
            },
          },
          "packages/pkg-a": {
            name: "pkg-a",
            version: "1.2.3",
            dependencies: {
              lodash: "^4.17.21",
            },
          },
          "packages/pkg-b": {
            name: "pkg-b",
            version: "1.0.0",
            dependencies: {
              "pkg-a": "^1.0.0",
            },
          },
          "node_modules/lodash": {
            version: "4.17.21",
          },
          "node_modules/pkg-a": {
            resolved: "packages/pkg-a",
            link: true,
          },
          "node_modules/pkg-b": {
            resolved: "packages/pkg-b",
            link: true,
          },
        },
      };

      writeFileSync(join(manifestsDir, "package.json"), JSON.stringify(packageJson, null, 2));
      writeFileSync(join(manifestsDir, "package-lock.json"), JSON.stringify(packageLock, null, 2));

      const parser = new NpmResolutionParser();
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      const graph = summary.graph!;
      expect(graph.nodes.length).toBe(4); // root, pkg-b, pkg-a, lodash

      const pkgBNode = graph.nodes.find((n) => n.name === "pkg-b")!;
      const pkgANode = graph.nodes.find((n) => n.name === "pkg-a")!;
      const lodashNode = graph.nodes.find((n) => n.name === "lodash")!;

      expect(pkgBNode.version).toBe("1.0.0");
      expect(pkgANode.version).toBe("1.2.3"); // retrieved from targetPkg
      expect(lodashNode.version).toBe("4.17.21");

      expect(pkgBNode.children).toContain(pkgANode.id);
      expect(pkgANode.children).toContain(lodashNode.id);
    });

    it("parses lockfile v1 (dependencies tree) format correctly", async () => {
      const workspacePath = join(TEST_DIR, "workspace-lock-v1");
      const manifestsDir = join(workspacePath, "manifests");
      mkdirSync(manifestsDir, { recursive: true });

      const packageJson = {
        name: "v1-app",
        version: "1.0.0",
        dependencies: {
          foo: "^1.0.0",
        },
      };

      const packageLock = {
        name: "v1-app",
        version: "1.0.0",
        lockfileVersion: 1,
        dependencies: {
          foo: {
            version: "1.0.0",
            requires: {
              bar: "^2.0.0",
            },
            dependencies: {
              bar: {
                version: "2.0.0",
              },
            },
          },
        },
      };

      writeFileSync(join(manifestsDir, "package.json"), JSON.stringify(packageJson, null, 2));
      writeFileSync(join(manifestsDir, "package-lock.json"), JSON.stringify(packageLock, null, 2));

      const parser = new NpmResolutionParser();
      const summary = await parser.parse(workspacePath, "existing-lockfile");

      expect(summary.totalDependencies).toBe(2);
      const graph = summary.graph!;
      expect(graph.nodes.length).toBe(3); // root, foo, bar

      const fooNode = graph.nodes.find((n) => n.id === "npm:foo@1.0.0")!;
      const barNode = graph.nodes.find((n) => n.id === "npm:bar@2.0.0")!;

      expect(fooNode.isDirect).toBe(true);
      expect(fooNode.isTransitive).toBe(false);
      expect(barNode.isDirect).toBe(false);
      expect(barNode.isTransitive).toBe(true);

      expect(fooNode.children).toContain(barNode.id);
      expect(barNode.parents).toContain(fooNode.id);
    });
  });

  describe("DependencyResolutionService", () => {
    let workspaceManager: WorkspaceManager;
    let runManager: RunManager;
    let service: DependencyResolutionService;

    beforeEach(() => {
      workspaceManager = new WorkspaceManager(TEST_DIR);
      runManager = new RunManager(TEST_DIR);
      service = new DependencyResolutionService(TEST_DIR);
    });

    it("resolves and persists metadata for existing lockfile project", async () => {
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const workspace = await workspaceManager.findOrCreateWorkspace(srcDir, ProjectType.Node);
      const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };
      const run = await runManager.createRun(workspace.id, projectInfo);

      const resolution = (await service.resolve(workspace, run)) as DependencyResolutionSuccess;

      expect(resolution.status).toBeUndefined();
      expect(resolution.schemaVersion).toBe(1);
      expect(resolution.projectType).toBe("node");
      expect(resolution.packageManager).toBe("npm");
      expect(resolution.resolutionSource).toBe("existing-lockfile");
      expect(resolution.directDependencies).toBe(2);
      expect(resolution.totalDependencies).toBe(3);
      expect(resolution.workspaceId).toBe(workspace.id);
      expect(resolution.projectId).toBe(workspace.id);
      expect(resolution.scanId).toBe(run.id);
      expect(resolution.manifestPath).toBe(join(workspace.sourcePath, "package.json"));
      expect(resolution.lockfilePath).toBe(join(workspace.sourcePath, "package-lock.json"));
      expect(resolution.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(resolution.lockfileHash).toMatch(/^[a-f0-9]{64}$/);

      const resolutionJsonPath = join(
        TEST_DIR,
        workspace.id,
        "runs",
        run.id,
        "dependency-resolution.json",
      );
      expect(existsSync(resolutionJsonPath)).toBe(true);

      const content = JSON.parse(readFileSync(resolutionJsonPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(content.resolutionSource).toBe("existing-lockfile");
      expect(content.directDependencies).toBe(2);
      expect(content.totalDependencies).toBe(3);
      expect(content.workspaceId).toBe(workspace.id);
      expect(content.projectId).toBe(workspace.id);
      expect(content.scanId).toBe(run.id);
      expect(content.manifestPath).toBe(join(workspace.sourcePath, "package.json"));
      expect(content.lockfilePath).toBe(join(workspace.sourcePath, "package-lock.json"));
      expect(content.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(content.lockfileHash).toMatch(/^[a-f0-9]{64}$/);

      const graphJsonPath = join(TEST_DIR, workspace.id, "runs", run.id, "dependency-graph.json");
      expect(existsSync(graphJsonPath)).toBe(true);

      const graphContent = JSON.parse(readFileSync(graphJsonPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(graphContent.schemaVersion).toBe(1);
      expect(graphContent.projectType).toBe("node");
      expect(graphContent.packageManager).toBe("npm");
      expect(Array.isArray(graphContent.nodes)).toBe(true);
      expect(Array.isArray(graphContent.edges)).toBe(true);
    });

    it("resolves and persists metadata for project without lockfile", async () => {
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const workspace = await workspaceManager.findOrCreateWorkspace(srcDir, ProjectType.Node);
      const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };
      const run = await runManager.createRun(workspace.id, projectInfo);

      const resolution = (await service.resolve(workspace, run)) as DependencyResolutionSuccess;

      expect(resolution.status).toBeUndefined();
      expect(resolution.resolutionSource).toBe("generated-lockfile");
      expect(resolution.directDependencies).toBe(1);
      expect(resolution.totalDependencies).toBeGreaterThan(0);

      const resolutionJsonPath = join(
        TEST_DIR,
        workspace.id,
        "runs",
        run.id,
        "dependency-resolution.json",
      );
      expect(existsSync(resolutionJsonPath)).toBe(true);

      const graphJsonPath = join(TEST_DIR, workspace.id, "runs", run.id, "dependency-graph.json");
      expect(existsSync(graphJsonPath)).toBe(true);
    });

    it("handles failed resolution for invalid package.json", async () => {
      const srcDir = join(FIXTURES_DIR, "invalid-package-json");
      const workspace = await workspaceManager.findOrCreateWorkspace(srcDir, ProjectType.Node);
      const projectInfo: ProjectInfo = { type: ProjectType.Node, manifest: "package.json" };
      const run = await runManager.createRun(workspace.id, projectInfo);

      const resolution = (await service.resolve(workspace, run)) as DependencyResolutionFailure;

      expect(resolution.status).toBe("failed");
      expect(resolution.reason).toBeDefined();

      const resolutionJsonPath = join(
        TEST_DIR,
        workspace.id,
        "runs",
        run.id,
        "dependency-resolution.json",
      );
      expect(existsSync(resolutionJsonPath)).toBe(true);

      const content = JSON.parse(readFileSync(resolutionJsonPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(content.status).toBe("failed");
    });
  });

  describe("CLI Command Integration", () => {
    it("successfully runs scan with existing lockfile", () => {
      const srcDir = join(FIXTURES_DIR, "node-with-lockfile");
      const result = runCLI("scan", srcDir, TEST_DIR);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Project Type: Node.js");
      expect(result.stdout).toContain("Resolution Source: existing-lockfile");
      expect(result.stdout).toContain("Direct Dependencies: 2");
      expect(result.stdout).toContain("Total Dependencies: 3");
    });

    it("successfully runs scan without lockfile and generates one", () => {
      const srcDir = join(FIXTURES_DIR, "node-without-lockfile");
      const result = runCLI("scan", srcDir, TEST_DIR);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Project Type: Node.js");
      expect(result.stdout).toContain("Resolution Source: generated-lockfile");
      expect(result.stdout).toContain("Direct Dependencies: 1");
      expect(result.stdout).toContain("Total Dependencies:");
    });

    it("exits with code 1 for failed resolution", () => {
      const srcDir = join(FIXTURES_DIR, "invalid-package-json");
      const result = runCLI("scan", srcDir, TEST_DIR);

      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain("Dependency resolution failed.");
    });
  });
});
