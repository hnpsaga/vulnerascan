# VulneraScan — Architecture

## Overview

VulneraScan is structured as a modular TypeScript/JavaScript CLI application. Each module has a well-defined responsibility, adheres to a strict inward-pointing dependency flow, and uses standard normalized data models to interact with other components.

```
Project Discovery
        ↓
Dependency Resolution
        ↓
Dependency Graph
        ↓
OSV Integration
        ↓
Normalized Vulnerability Findings
        ↓
Reporting
```

---

## Directory Structure

```
src/
├── cli.ts              # Entry point — Commander program setup
├── index.ts            # Public API exports
├── commands/
│   ├── scan.ts         # scan command orchestrator (CLI entry)
│   ├── scan-pipeline.ts # ScanPipeline coordination service
│   ├── doctor.ts       # doctor command environment validator
│   └── version.ts      # version command printer
├── discovery/          # Project manifestation and type discovery
├── resolution/         # Dependency resolution & graph generation
│   ├── dispatcher.ts   # Resolver Dispatcher routing to ecosystem resolvers
│   ├── interfaces.ts   # Core interfaces for manifest managers, generators, and parsers
│   ├── dependency-resolution-service.ts # Main service orchestrating resolution
│   ├── models/         # Normalized dependency models (DependencyGraph, DependencyResolution)
│   ├── node/           # Node.js ecosystem resolver implementation
│   │       ├── resolver.ts # Node resolver delegating to generator, parser, and manifest manager
│   │       ├── npm-lockfile-generator.ts
│   │       ├── npm-manifest-manager.ts
│   │       └── npm-resolution-parser.ts
│   └── php/            # PHP ecosystem resolver implementation
│       ├── resolver.ts # PHP resolver delegating to parser and manifest manager
│       ├── php-manifest-manager.ts
│       └── php-resolution-parser.ts
├── vulnerability/      # Vulnerability matching & finding construction
│   ├── matcher/        # Ecosystem-specific matchers
│   │   ├── matcher.ts  # Base matcher interface
│   │   └── node-semver.ts # Node.js / SemVer version matcher implementation
│   ├── detector.ts     # Core vulnerability detection engine
│   ├── findings.ts     # Vulnerability finding construction
│   ├── matcher.ts      # Lightweight Matcher Coordinator
│   └── vulnerability-models.ts # Shared models
├── reporting/          # Markdown, JSON, Console reporting engine
├── workspace/          # Workspace & execution run filesystem managers
│   ├── models/         # Workspace data structures
│   │   ├── discovery.ts
│   │   ├── project-registry.ts # ProjectRegistryEntry and ProjectRegistry schema
│   │   ├── run.ts
│   │   ├── workspace-metadata.ts # WorkspaceMetadata, RunIndex, and RunIndexEntry schema
│   │   └── workspace.ts
│   ├── constants.ts
│   ├── project-registry-service.ts # Global project tracking and lookup registry
│   ├── run-manager.ts
│   ├── workspace-api-service.ts    # Reusable business logic APIs for CLI/Dashboard
│   ├── workspace-manager.ts
│   └── workspace-metadata-service.ts # Run indexing and metadata updating logic
└── utils/              # Shared utility functions
```

---

## Core Scanning Pipeline

The VulneraScan execution pipeline is coordinated by the `ScanPipeline` class:

### 1. Project Discovery

- Locates supported project manifests (e.g., `package.json`, `pom.xml`, etc.), identifying the project's ecosystem, and registers the project within a workspace.

### 2. Dependency Resolution

- Resolves package dependencies, processes lockfiles, prepares dependency metadata, and persists resolution details.

### 3. Dependency Graph Generation

- Constructs a structural representation of resolved project dependencies (`DependencyGraph`), modeling parent/child links and package version relationships.

### 4. OSV Integration

- Queries the OSV API using the resolved package coordinates. Uses a filesystem cache with TTL to cache results and avoid unnecessary network requests.

### 5. Vulnerability Detection & Findings

- Evaluates the vulnerability data against the resolved dependency graph version constraints.
- Employs a lightweight Matcher Coordinator (`vulnerability/matcher.ts`) that determines the appropriate ecosystem-specific matcher (e.g., `NodeSemverMatcher`) to delegate version comparison logic.
- Constructs normalized, canonical findings (`VulnerabilityFinding`) mapping advisories back to specific nodes in the graph.

### 6. Reporting

- Executes the reporting engine to output scan results into user-facing formats (e.g., markdown reports, JSON summaries, console logs).

---

## Module Isolation Rules

To prepare the codebase for multi-language support, modules are strictly isolated:

1. **Dependency Resolution**:
   - **Resolver Dispatcher**: A lightweight orchestrator (`src/resolution/dispatcher.ts`) that determines the workspace ecosystem and delegates dependency resolution to the appropriate ecosystem-specific resolver. It contains no dependency resolution logic itself.
   - **Ecosystem Resolvers**: Independent modules grouped by ecosystem (e.g., `src/resolution/node/`) that implement discovery, lockfile generation, package parsing, and normalization for their respective language ecosystems.
   - **Normalized Dependency Model Contract**: Every ecosystem resolver must produce a consistent, schema-compliant `DependencyResolution` metadata object and a `DependencyGraph` structure to keep downstream processing entirely decoupled from ecosystem-specific details.
2. **OSV Integration**: The `osv` module is fully isolated. Provider-specific raw HTTP/API shapes are kept private, and it returns only normalized canonical domain models (`VulnerabilityRecord`).
3. **Vulnerability Detection**: The `vulnerability` module performs version comparison and finding generation against the dependency graph.
4. **Reporting**: The `reporting` module depends only on normalized findings and produces structured output. It contains no vulnerability detection or dependency resolution logic.

---

## Global Workspace & Project Registry

VulneraScan organizes project scan outcomes and history in a centralized database-less storage system using simple structured filesystem directories under the `VULNERASCAN_HOME` environment variable (default: `~/.vulnerascan`).

### Directory Layout

```
~/.vulnerascan/
├── projects.json                  # Global Project Registry tracking all known projects
└── workspaces/
    └── <workspace_id>/            # Unique project workspace directory (derived from project path)
        ├── workspace.json         # Raw workspace metadata
        ├── metadata.json          # Workspace statistics, status, latest successful/failed scans
        ├── run-index.json         # Scan timeline and run summary index
        └── runs/
            └── <run_timestamp>/   # Individual execution folder containing reports/artifacts
                ├── run.json
                ├── discovery.json
                └── vulnerabilities.json
```

### Key Services

- **Project Registry Service (`src/workspace/project-registry-service.ts`)**: Serves as the central repository registry to record and query tracked directories, ecosystems, and overall statuses without traversing subdirectories.
- **Workspace Metadata Service (`src/workspace/workspace-metadata-service.ts`)**: Coordinates recording run index timelines and maintaining statistics on direct/transitive dependencies and vulnerability counts.
- **Workspace API Service (`src/workspace/workspace-api-service.ts`)**: Clean wrapper exposes APIs for project registration, details lookup, lists, scan history, and run summaries.

---

## Dashboard Backend Service

VulneraScan provides a presentation-oriented dashboard service to aggregate workspace and project scan details for consumers (like a CLI, future web UI, REST API, or exports) without requiring direct parsing of raw run directories or workspace files.

The dashboard service behaves strictly as a presentation-aggregation layer.

### Key Responsibilities

1. **Information Aggregation**: Loads registered projects, latest scans, scan histories, and individual vulnerability records to produce unified summaries.
2. **Normalized Presentation Models**: Maps workspace metadata and completed scan runs to normalized presentation-oriented contracts (`src/models/dashboard.ts`):
   - **`DashboardSummary`**: System-wide status statistics, vulnerability severities, ecosystems breakdown, and project summary list.
   - **`ProjectSummary`**: Specific project details, workspace identifiers, latest scan run details, and aggregated vulnerabilities.
   - **`ScanSummary`**: Individual execution status, dependency counts, duration, and error/findings summary.
   - **`VulnerabilitySummary`**: Categorized breakdown of total vulnerabilities by severity levels (`critical`, `high`, `medium`, `low`, `unknown`).
   - **`HistoricalScanSummary`**: Normalized record of completed runs with timeline details.
3. **Filtering & Statistics**: Evaluates filter configurations (by ecosystem, project ID, severity, or scan timeline dates) efficiently.
4. **Service Boundaries**: Depends strictly on `ProjectRegistry`, `WorkspaceServices`, and the `RunIndex`. It does not perform dependency resolution, version matching, OSV querying, or direct scanning.
