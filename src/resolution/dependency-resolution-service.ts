import { Workspace } from "../workspace/models/workspace.js";
import { Run } from "../workspace/models/run.js";
import { DependencyResolution } from "./models/dependency-resolution.js";
import { ResolverDispatcher } from "./dispatcher.js";
import path from "path";
import { homedir } from "os";

export class DependencyResolutionService {
  private baseDir: string;
  private dispatcher: ResolverDispatcher;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      const home = process.env.VULNERASCAN_HOME || homedir();
      this.baseDir = path.join(home, ".vulnerascan", "workspaces");
    }
    this.dispatcher = new ResolverDispatcher();
  }

  async resolve(workspace: Workspace, run: Run): Promise<DependencyResolution> {
    return this.dispatcher.resolve(workspace, run, this.baseDir);
  }
}
