import { Workspace } from "../workspace/models/workspace.js";
import { Run } from "../workspace/models/run.js";
import { DependencyResolution } from "./models/dependency-resolution.js";
import { NodeResolver } from "./node/resolver.js";
import { JavaResolver } from "./java/resolver.js";
import { PythonResolver } from "./python/resolver.js";
import { GoResolver } from "./go/resolver.js";
import { RustResolver } from "./rust/resolver.js";
import { DotnetResolver } from "./dotnet/resolver.js";
import { ProjectType } from "../models/project-type.js";

export class ResolverDispatcher {
  private nodeResolver: NodeResolver;
  private javaResolver: JavaResolver;
  private pythonResolver: PythonResolver;
  private goResolver: GoResolver;
  private rustResolver: RustResolver;
  private dotnetResolver: DotnetResolver;

  constructor() {
    this.nodeResolver = new NodeResolver();
    this.javaResolver = new JavaResolver();
    this.pythonResolver = new PythonResolver();
    this.goResolver = new GoResolver();
    this.rustResolver = new RustResolver();
    this.dotnetResolver = new DotnetResolver();
  }

  async resolve(workspace: Workspace, run: Run, baseDir: string): Promise<DependencyResolution> {
    const projectType = workspace.projectType;

    switch (projectType as ProjectType) {
      case ProjectType.Node:
        return this.nodeResolver.resolve(workspace, run, baseDir);
      case ProjectType.Maven:
      case ProjectType.Gradle:
        return this.javaResolver.resolve(workspace, run, baseDir);
      case ProjectType.Python:
        return this.pythonResolver.resolve(workspace, run, baseDir);
      case ProjectType.Go:
        return this.goResolver.resolve(workspace, run, baseDir);
      case ProjectType.Rust:
        return this.rustResolver.resolve(workspace, run, baseDir);
      case ProjectType.Dotnet:
        return this.dotnetResolver.resolve(workspace, run, baseDir);
      default:
        throw new Error(`Unsupported project type for dependency resolution: ${projectType}`);
    }
  }
}
