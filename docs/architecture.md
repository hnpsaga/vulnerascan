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
│   └── node/           # Node.js ecosystem resolver implementation
│       ├── resolver.ts # Node resolver delegating to generator, parser, and manifest manager
│       ├── npm-lockfile-generator.ts
│       ├── npm-manifest-manager.ts
│       └── npm-resolution-parser.ts
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
