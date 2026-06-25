# VulneraScan — Architecture

## Overview

VulneraScan is structured as a layered CLI application. Each layer has a well-defined responsibility and can be evolved independently.

```
┌─────────────────────────────────────┐
│              CLI Layer              │
│  vulnerascan [scan|doctor|version]  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Command Layer             │
│  scan.ts | doctor.ts | version.ts   │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Scanner Layer             │
│  Project discovery, dep graph       │
│  (planned for v0.0.2+)              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Provider Layer            │
│  OSV | NVD | GitHub Advisories      │
│  (planned for v0.1.0+)              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Plugin Layer              │
│  Ecosystem-specific scanners        │
│  (planned for v0.1.0+)              │
└─────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── cli.ts              # Entry point — Commander program setup
├── commands/
│   ├── scan.ts         # scan command
│   ├── doctor.ts       # doctor command
│   └── version.ts      # version command
└── utils/              # Shared utilities (planned)

tests/
└── cli.test.ts         # Vitest integration tests

docs/
├── project-overview.md
├── architecture.md
├── roadmap.md
└── adr/                # Architecture Decision Records

.github/
├── workflows/
│   ├── ci.yml          # CI pipeline
│   └── release.yml     # Release preparation workflow
├── ISSUE_TEMPLATE/
├── PULL_REQUEST_TEMPLATE.md
└── CODEOWNERS
```

---

## CLI Layer

The CLI entry point ([`src/cli.ts`](../src/cli.ts)) uses [Commander](https://github.com/tj/commander.js) to define the root command and register subcommands.

**Responsibilities:**

- Parse `process.argv`
- Route to the correct command handler
- Display top-level help

---

## Command Layer

Each command is an isolated Commander `Command` object exported from its own module under `src/commands/`.

| Command   | File         | Responsibility                           |
| --------- | ------------ | ---------------------------------------- |
| `scan`    | `scan.ts`    | Initiates a vulnerability scan (v0.0.2+) |
| `doctor`  | `doctor.ts`  | Checks environment health                |
| `version` | `version.ts` | Prints the current version               |

---

## Scanner & Resolution Layer

The backend processing is structured into three distinct, decoupled sub-layers:

### 1. Project Discovery

- **Responsibility**: Locating supported project manifests (e.g., `package.json`, `pom.xml`, `requirements.txt`, etc.), identifying the project's ecosystem, and registering the project within a workspace.
- **Important**: Discovered project types are not automatically supported for full dependency analysis. Only Node.js/npm is fully supported for dependency resolution and graph generation at this time.

### 2. Dependency Resolution

- **Responsibility**: Resolving dependencies, reading lockfiles, preparing dependency metadata, and persisting resolution details (workspace/project/scan identifiers, manifest/lockfile paths, and hashes for future historical/incremental scanning).

### 3. Dependency Graph Generation

- **Responsibility**: Constructing a pure, structural representation of resolved project dependencies.
- **Design Principle**: The dependency graph (`dependency-graph.json`) is a pure structural representation modeling package relationships (depth, parents, children, direct vs transitive). It contains no vulnerability-specific logic, AI-generated content, or OSV-specific data.
- **Downstream Consumption**: Future vulnerability detection, scoring, and remediation tools consume these stable dependency graph and resolution artifacts rather than modifying them, preserving clean separation of concerns.

For full details on the graph data model, node/edge representation, and generation process, refer to the [Dependency Graph Engine Documentation](./dependency-graph.md).

---

## Provider Layer

The Provider Layer (implemented in v0.0.6) abstracts over vulnerability databases (specifically the OSV API). It maps dependency graph package coordinates to vulnerability query formats, handles networking, caching, and retries, and outputs normalized vulnerability structures. See [Provider Layer Documentation](./provider-layer.md) and [ADR-003](./adr/003-provider-layer.md).

All providers implement the `VulnerabilityProvider` interface:

```typescript
export interface VulnerabilityProvider {
  readonly name: string;
  queryPackages(packages: PackageCoordinate[]): Promise<ProviderResponse>;
}
```

---

## Plugin Layer _(planned)_

The plugin layer enables ecosystem-specific scanners to be registered and discovered dynamically. See [ADR-002](./adr/002-plugin-architecture.md).

---

## Configuration

The CLI stores its configuration in `~/.vulnerascan/` (created on first run by `doctor`).

---

## TypeScript Configuration

| Setting            | Value      | Rationale                       |
| ------------------ | ---------- | ------------------------------- |
| `strict`           | `true`     | Maximum type safety             |
| `module`           | `NodeNext` | Native ESM for Node.js          |
| `moduleResolution` | `NodeNext` | Correct ESM resolution          |
| `target`           | `ES2022`   | Modern JavaScript features      |
| `noImplicitAny`    | `true`     | No implicit `any` types allowed |
