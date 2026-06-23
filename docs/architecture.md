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

## Scanner Layer _(planned)_

The scanner layer will be responsible for:

1. Discovering project manifests (`package.json`, `pom.xml`, `requirements.txt`, etc.)
2. Building a dependency graph
3. Resolving transitive dependencies

---

## Provider Layer _(planned)_

The provider layer abstracts over vulnerability databases. See [ADR-003](./adr/003-provider-layer.md).

Each provider implements a common interface:

```typescript
interface VulnerabilityProvider {
  name: string;
  lookup(packageName: string, version: string): Promise<Vulnerability[]>;
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
