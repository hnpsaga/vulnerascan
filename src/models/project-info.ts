import { ProjectType } from "./project-type.js";

export interface ProjectInfo {
  type: ProjectType;
  manifest: string;
}
