# Supported Ecosystems

VulneraScan supports vulnerability scanning across multiple programming language ecosystems using a consistent workflow. Regardless of the language being scanned, every supported project follows the same high-level pipeline:

1. Detect the project ecosystem.
2. Resolve project dependencies.
3. Query the Open Source Vulnerability (OSV) database.
4. Match vulnerabilities against resolved dependency versions.
5. Generate reports.
6. Store scan history for the local dashboard.

Every supported ecosystem participates in the complete scan pipeline and generates the same reports and dashboard data.

---

# Ecosystem Support Matrix

| Ecosystem   | Supported Manifest Files               | Supported Lockfiles                                                       | Dependency Resolution                                                  | Vulnerability Scanning |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| **Node.js** | `package.json`                         | `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock` | Native package manager with isolated lockfile generation when required | ✅                      |
| **Maven**   | `pom.xml`                              | `pom.xml`                                                                 | Offline manifest parsing                                               | ✅                      |
| **Gradle**  | `build.gradle`, `build.gradle.kts`     | Build scripts                                                             | Offline manifest parsing                                               | ✅                      |
| **Python**  | `requirements.txt`, `pyproject.toml`   | `poetry.lock`, `Pipfile.lock`                                             | Offline manifest and lockfile parsing                                  | ✅                      |
| **Go**      | `go.mod`                               | `go.sum`                                                                  | Offline manifest and lockfile parsing                                  | ✅                      |
| **Rust**    | `Cargo.toml`                           | `Cargo.lock`                                                              | Offline manifest and lockfile parsing                                  | ✅                      |
| **.NET**    | `*.csproj`, `Directory.Packages.props` | `packages.lock.json`                                                      | Offline manifest and lockfile parsing                                  | ✅                      |
| **PHP**     | `composer.json`                        | `composer.lock`                                                           | Offline manifest and lockfile parsing                                  | ✅                      |

Every supported ecosystem generates:

* Terminal summary
* Markdown report
* JSON report
* CSV report
* SARIF
* CycloneDX SBOM
* SPDX SBOM
* AI Context (JSON)
* AI Context (Markdown)

Every scan is also recorded in the local workspace and becomes immediately available in the dashboard.

---

# Dependency Resolution

## Node.js

Node.js projects use the native package manager to construct an accurate dependency graph.

Supported package managers include:

* npm
* pnpm
* Yarn

If a supported lockfile already exists, VulneraScan uses it directly.

If no lockfile exists, VulneraScan generates one **inside its isolated workspace** using the appropriate package manager before resolving dependencies.

Your project directory is never modified.

---

## Maven

Maven projects are resolved by parsing `pom.xml` directly.

No Maven build is executed and no project files are modified.

---

## Gradle

Gradle projects are resolved by parsing `build.gradle` or `build.gradle.kts`.

No Gradle build is executed and no project files are modified.

---

## Python

Python projects support:

* Poetry
* Pipenv
* pip requirements
* PEP 621 (`pyproject.toml`)

When lockfiles are present, they are used to improve dependency resolution. Otherwise, dependencies are extracted directly from the project manifests.

---

## Go

Go projects are resolved using:

* `go.mod`
* `go.sum`

When `go.sum` is available, VulneraScan uses it to improve dependency resolution for transitive dependencies.

---

## Rust

Rust projects support:

* `Cargo.toml`
* `Cargo.lock`

When `Cargo.lock` is present, VulneraScan resolves the complete dependency graph. Otherwise, dependency information is derived from `Cargo.toml`.

---

## .NET

.NET projects support:

* `*.csproj`
* `Directory.Packages.props`
* `packages.lock.json`

When a lockfile is present, VulneraScan uses it to improve dependency resolution.

---

## PHP

PHP projects support:

* `composer.json`
* `composer.lock`

When `composer.lock` is available, VulneraScan resolves the complete dependency graph. Otherwise, dependency information is extracted from `composer.json`.

---

# Workspace Isolation

Every ecosystem follows the same workspace model.

For each scanned project, VulneraScan creates an isolated workspace that contains:

* Copied manifests and lockfiles
* Generated lockfiles (when required)
* Dependency resolution artifacts
* Scan metadata
* Generated reports
* Dashboard data

All dependency resolution occurs inside this isolated workspace.

Your source project is never modified.

---

# Dashboard Support

Every successful scan is automatically recorded in the local workspace.

The dashboard provides a unified view across every supported ecosystem, including:

* Registered projects
* Scan history
* Vulnerability summaries
* Dependency statistics
* Individual scan reports

No additional configuration is required for different programming languages.

---

# Best Practices

For the most accurate results:

* Commit dependency lockfiles whenever your ecosystem supports them.
* Re-run scans after updating project dependencies.
* Review both the generated reports and dashboard summaries.
* Scan projects regularly to identify newly disclosed vulnerabilities.

Providing lockfiles where available improves dependency resolution accuracy, particularly for transitive dependencies.

---

# Current Limitations

VulneraScan supports the complete scan pipeline for every ecosystem listed above. Some ecosystems rely on manifest parsing when complete lockfile information is unavailable.

For the highest accuracy:

* Keep dependency lockfiles under version control.
* Scan projects from their repository root.
* Use the package manager normally recommended for your ecosystem.

As VulneraScan evolves, dependency resolution accuracy will continue to improve while maintaining the same privacy-first, local scanning model.
