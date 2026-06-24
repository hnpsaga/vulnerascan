import { ProjectType } from "../../models/project-type.js";

export interface DiscoveryArtifact {
  schemaVersion: number;
  projectType: ProjectType;
  manifest: string;
  sourcePath: string;
}
