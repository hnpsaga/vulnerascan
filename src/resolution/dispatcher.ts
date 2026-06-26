import { Workspace } from "../workspace/models/workspace.js";
import { Run } from "../workspace/models/run.js";
import { DependencyResolution } from "./models/dependency-resolution.js";
import { NodeResolver } from "./node/resolver.js";
import { JavaResolver } from "./java/resolver.js";
import { ProjectType } from "../models/project-type.js";

export class ResolverDispatcher {
  private nodeResolver: NodeResolver;
  private javaResolver: JavaResolver;

  constructor() {
    this.nodeResolver = new NodeResolver();
    this.javaResolver = new JavaResolver();
  }

  async resolve(workspace: Workspace, run: Run, baseDir: string): Promise<DependencyResolution> {
    const projectType = workspace.projectType;

    switch (projectType as ProjectType) {
      case ProjectType.Node:
        return this.nodeResolver.resolve(workspace, run, baseDir);
      case ProjectType.Maven:
      case ProjectType.Gradle:
        return this.javaResolver.resolve(workspace, run, baseDir);
      default:
        throw new Error(`Unsupported project type for dependency resolution: ${projectType}`);
    }
  }
}
