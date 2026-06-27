# Dependency Graph

The Dependency Graph is the canonical representation of a project's dependency structure within VulneraScan.

Every supported ecosystem is transformed into this common model before vulnerability detection, report generation, or export processing begins. This allows the remainder of the scan pipeline to operate independently of language-specific package managers and lockfile formats.

---

# Purpose

Different ecosystems describe dependencies using different manifests and lockfiles.

For example:

- Node.js uses `package-lock.json`
- Rust uses `Cargo.lock`
- Go uses `go.mod` and `go.sum`
- Maven uses `pom.xml`

Rather than requiring every subsystem to understand every ecosystem, VulneraScan converts each project into a single language-agnostic dependency graph.

This graph becomes the shared data model used throughout the remainder of the scan pipeline.

---

# Dependency Graph Lifecycle

The dependency graph is produced once during dependency resolution and then reused throughout the scan.

```text
Project
    │
    ▼
Dependency Resolution
    │
    ▼
Dependency Graph
    │
    ├────────► Vulnerability Detection
    ├────────► Reports
    ├────────► Exporters
    └────────► Dashboard
```

Because every downstream subsystem consumes the same graph, ecosystem-specific logic remains isolated within the dependency resolution layer.

---

# Core Model

The dependency graph is composed of two concepts:

| Component | Responsibility                                       |
| --------- | ---------------------------------------------------- |
| Nodes     | Represent the project and every resolved dependency. |
| Edges     | Represent dependency relationships between nodes.    |

Together, these components model the complete dependency tree of the scanned project.

---

# Node Types

The graph distinguishes three categories of nodes.

## Root Project

Represents the scanned application.

There is exactly one root node in every dependency graph.

---

## Direct Dependencies

Packages declared directly by the project.

These form the first level beneath the root project.

---

## Transitive Dependencies

Packages introduced by other dependencies.

These may appear at any depth beneath the root project.

---

# Relationships

Dependencies are represented as a directed graph.

Each relationship identifies which package depends on another.

This structure enables VulneraScan to:

- determine dependency paths
- distinguish direct and transitive dependencies
- calculate dependency statistics
- generate standards-compliant SBOMs

---

# Graph Construction

Each supported ecosystem is responsible for constructing the dependency graph from its native package metadata.

Although implementations differ between ecosystems, they all follow the same architectural workflow:

1. Copy project manifests into the workspace.
2. Locate or generate a lockfile when required.
3. Parse the resolved dependency information.
4. Build the canonical dependency graph.
5. Validate the resulting graph before returning it to the scan pipeline.

Once this process completes, the remainder of the application operates exclusively on the dependency graph rather than ecosystem-specific files.

---

# Graph Consumers

The dependency graph is shared across multiple subsystems.

| Consumer                | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| Vulnerability Detection | Matches resolved packages against OSV advisories.         |
| Report Generation       | Produces human-readable scan reports.                     |
| Exporters               | Generates CycloneDX, SPDX, SARIF, and AI Context outputs. |
| Dashboard               | Displays dependency statistics and scan information.      |

This shared model eliminates duplicate parsing logic and ensures every subsystem operates on the same dependency information.

---

# Design Principles

## Language-Agnostic

Every supported ecosystem is represented using the same dependency graph model.

This allows exporters, reporting, and vulnerability detection to remain independent of package manager implementation details.

---

## Immutable Scan Snapshot

Each scan produces a dependency graph representing the project at a single point in time.

This snapshot is preserved as part of the scan history and is reused by exporters and the dashboard without rescanning the project.

---

## Separation of Responsibilities

The dependency graph describes only dependency structure.

It intentionally does **not** contain:

- vulnerability information
- CVSS scores
- advisory metadata
- remediation guidance

Those concerns belong to the vulnerability detection subsystem.

---

# Extending the Dependency Graph

Adding support for a new ecosystem follows the same architectural pattern as existing implementations.

Contributors should:

1. Implement project manifest handling.
2. Parse the ecosystem's dependency information.
3. Construct the canonical dependency graph.
4. Register the resolver with the dispatcher.

As long as the resulting graph conforms to the canonical model, the remaining scan pipeline—including vulnerability detection, reporting, exporters, and the dashboard—works without ecosystem-specific changes.

---

# Current Limitations

The current implementation has several known architectural limitations.

- Dependency path resolution follows a single parent path when multiple parent relationships exist.
- Dependency path traversal applies a maximum traversal depth to prevent infinite recursion in cyclic graphs.
- Some ecosystems currently expose less complete dependency relationship information than others due to limitations in their native metadata.

These limitations affect only graph construction and traversal. They do not change the overall architecture of the dependency graph.

---

# Related Documentation

The dependency graph is one component of the overall VulneraScan architecture.

For additional details, see:

- **Architecture Overview** — Overall system architecture.
- **OSV Integration** — How vulnerabilities are retrieved and matched against graph nodes.
