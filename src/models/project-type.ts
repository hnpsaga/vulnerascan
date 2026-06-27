export enum ProjectType {
  Node = "node",
  Maven = "maven",
  Gradle = "gradle",
  Python = "python",
  Go = "go",
  Rust = "rust",
  Dotnet = "dotnet",
  PHP = "php",
}

const projectTypeDisplayNames: Record<ProjectType, string> = {
  [ProjectType.Node]: "Node.js",
  [ProjectType.Maven]: "Maven",
  [ProjectType.Gradle]: "Gradle",
  [ProjectType.Python]: "Python",
  [ProjectType.Go]: "Go",
  [ProjectType.Rust]: "Rust",
  [ProjectType.Dotnet]: ".NET",
  [ProjectType.PHP]: "PHP",
};

export function getProjectTypeDisplayName(type: ProjectType): string {
  return projectTypeDisplayNames[type];
}
