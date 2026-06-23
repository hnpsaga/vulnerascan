export enum ProjectType {
  Node = "node",
  Maven = "maven",
  Gradle = "gradle",
  Python = "python",
}

const projectTypeDisplayNames: Record<ProjectType, string> = {
  [ProjectType.Node]: "Node.js",
  [ProjectType.Maven]: "Maven",
  [ProjectType.Gradle]: "Gradle",
  [ProjectType.Python]: "Python",
};

export function getProjectTypeDisplayName(type: ProjectType): string {
  return projectTypeDisplayNames[type];
}
