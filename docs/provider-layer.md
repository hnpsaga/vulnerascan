# Vulnerability Provider Layer

The **Vulnerability Provider Layer** (introduced in v0.0.6) abstracts external vulnerability databases behind a common interface. It is responsible for querying databases, managing local caches, and returning normalized vulnerability records for packages resolved in the dependency graph.

---

## Architecture Overview

```
┌───────────────────────────────────────┐
│        Dependency Graph Engine        │
│    (Provides resolved package list)   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│             Provider Layer            │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │          ProviderRegistry         │ │
│ └─────────────────┬─────────────────┘ │
│                   ▼                   │
│ ┌───────────────────────────────────┐ │
│ │       VulnerabilityProvider       │ │
│ │          (Active: OSV)            │ │
│ └───────┬───────────────────┬───────┘ │
│         │                   │         │
│         ▼                   ▼         │
│ ┌───────────────┐   ┌───────────────┐ │
│ │  Local Cache  │   │  OSV HTTP API │ │
│ └───────────────┘   └───────────────┘ │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│          provider-results.json        │
└───────────────────────────────────────┘
```

The design enforces decoupling. External database formats are kept hidden from the scanner's matching and CLI reporting engines.

---

## Dependency Graph: The Source of Truth

The Provider Layer respects the Dependency Graph as the single source of truth for resolved packages:

- **No Direct Lockfile Reading**: The Provider Layer does not extract or parse `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` again.
- **In-Memory Consumability**: The Provider Layer consumes the in-memory `DependencyGraph` object returned by the Dependency Resolution Engine.
- **Run Isolation**: Each scan run produces isolated dependency graph and provider results. Graph state and vulnerability details are never mixed across runs.

---

## Domain Models

The following core structures are defined in [provider-models.ts](../src/provider/models/provider-models.ts):

### 1. `PackageCoordinate`

Represents a resolved package ecosystem, identity, and version.

```typescript
export interface PackageCoordinate {
  ecosystem: string;
  packageName: string;
  version: string;
}
```

### 2. `VulnerabilityReference`

Represents an advisory, patch, or report link.

```typescript
export interface VulnerabilityReference {
  source: string; // e.g. "ADVISORY", "WEB"
  identifier: string; // e.g. URL string
  url: string;
}
```

### 3. `VulnerabilityRecord`

An ecosystem-agnostic vulnerability description.

```typescript
export interface VulnerabilityRecord {
  id: string;
  aliases: string[];
  summary: string;
  details?: string;
  references: VulnerabilityReference[];
  affectedPackages: PackageCoordinate[];
}
```

### 4. `ProviderResponse`

```typescript
export interface ProviderResponse {
  provider: string;
  vulnerabilities: VulnerabilityRecord[];
  metadata?: Record<string, unknown>;
}
```

---

## Provider Abstraction

All providers must implement the `VulnerabilityProvider` interface:

```typescript
export interface VulnerabilityProvider {
  readonly name: string;
  queryPackages(packages: PackageCoordinate[]): Promise<ProviderResponse>;
}
```

---

## Registry Architecture

The `ProviderRegistry` class encapsulates active provider selection:

- It maintains a registry of initialized providers.
- It resolves the provider name specified in the configuration file.
- Currently, **OSV** is the only registered provider. Adding future providers requires registering them with the registry.

---

## Configuration Architecture

Provider settings are stored at `~/.vulnerascan/config.json`. The configuration file is validated against the following structure, with sensible defaults if a field is omitted:

```json
{
  "provider": {
    "active": "osv",
    "osv": {
      "cache": {
        "enabled": true,
        "ttlHours": 24
      }
    }
  }
}
```

Validation rules:

- `provider` section must exist.
- `provider.active` must be a non-empty string and must currently be `"osv"`.
- `provider.osv.cache.enabled` must be a boolean.
- `provider.osv.cache.ttlHours` must be a non-negative number.

---

## Cache Architecture

To minimize network calls and respect API usage, a local cache is implemented:

- **Interface**: `VulnerabilityCache` specifies `get(coordinate)` and `set(coordinate, vulnerabilities)`.
- **FS Cache Implementation**: `FilesystemVulnerabilityCache` persists vulnerability records at the package-coordinate level.
- **Cache File Naming**: Safe, sanitized file names inside the workspace directory, e.g. `.vulnerascan/workspaces/<workspace-id>/cache/osv/npm-lodash-4.17.20.json`.
- **TTL Support**: Cache files older than `ttlHours` are automatically ignored and overwritten on subsequent scans.

---

## OSV Provider Design

The `OsvVulnerabilityProvider` implements queries against the official Google OSV database:

- **Ecosystem Mapping**: Maps VulneraScan ecosystem strings to OSV-recognized ecosystem names (e.g. `npm` -> `npm`, `maven` -> `Maven`, `python` -> `PyPI`).
- **Batch Requests**: Packages are grouped and queried in chunks using `/v1/querybatch` to resolve vulnerability IDs in a single network round-trip.
- **Vulnerability Details**: Discovered vulnerability IDs are hydrated in parallel (concurrency-limited) via `/v1/vulns/{id}` to pull full details.
- **Network Resilience**:
  - **Retries**: Implements exponential backoff retry (up to 3 retries) on `5xx` server/network errors.
  - **Timeouts**: Uses AbortController to enforce timeouts (default: 10s).
  - **Error Handling**: Gracefully handles network failures, logging warnings and mapping empty or fallback records to ensure scanning is never blocked.
