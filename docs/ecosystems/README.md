# Ecosystems

VulneraScan supports project manifest detection and dependency graph resolution across multiple software language environments.

## Supported Environments

| Ecosystem   | Manifest File(s)                      | Resolver Engine Details                                                  |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------ |
| **Node.js** | `package.json` / `package-lock.json`  | Built-in npm lockfile generator & parser. Resolves `node_modules` trees. |
| **PHP**     | `composer.json` / `composer.lock`     | Resolves Composer lock file structures and models packages.              |
| **Python**  | `requirements.txt` / `pyproject.toml` | Reads pip and poetry configuration layouts.                              |
| **Maven**   | `pom.xml`                             | Discovers JVM Maven specifications.                                      |
| **Gradle**  | `build.gradle` / `build.gradle.kts`   | Discovers JVM Gradle configuration scripts.                              |
| **Go**      | `go.mod` / `go.sum`                   | Discovers Go module lists.                                               |
| **Rust**    | `Cargo.toml` / `Cargo.lock`           | Discovers Rust package lists.                                            |
| **.NET**    | `*.csproj` / `packages.lock.json`     | Discovers NuGet lock and project descriptors.                            |
