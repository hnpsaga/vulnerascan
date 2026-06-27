# OSV Integration Architecture

The **OSV Integration Module** (located in `src/osv/`) handles all interactions with the Google Open Source Vulnerabilities (OSV) database. It is responsible for querying the OSV API, caching results locally to minimize network overhead, and mapping raw API responses into normalized domain models.

---

## Architectural Overview

Unlike previous versions that relied on a generalized provider interface registry, the current architecture uses a dedicated, highly optimized `OsvClient` to manage OSV queries.

```
┌───────────────────────────────────────┐
│        Dependency Graph Engine        │
│    (Provides resolved package list)   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│              OsvClient                │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │          Local Cache Check        │ │
│ └─────────────────┬─────────────────┘ │
│                   ▼                   │
│ ┌───────────────────────────────────┐ │
│ │        Batch API Request          │ │
│ │       (/v1/querybatch)            │ │
│ └─────────────────┬─────────────────┘ │
│                   ▼                   │
│ ┌───────────────────────────────────┐ │
│ │      Parallel Vuln Hydration       │ │
│ │       (/v1/vulns/{id})            │ │
│ └───────────────────────────────────┘ │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│         vulnerabilities.json          │
└───────────────────────────────────────┘
```

Downstream components consume normalized, canonical domain models, insulating the rest of the application from change in the external API schema.

---

## Dependency Graph: The Source of Truth

The OSV Integration module respects the dependency graph:

- **No Lockfile Reparsing**: It consumes the resolved `DependencyGraph` and uses the package coordinates (ecosystem, name, version) to build requests.
- **Run Isolation**: Every execution maintains isolated vulnerability lookup results.

---

## Domain Models

The public surface of the OSV module is defined in [src/osv/index.ts](file:///home/hnpsaga/projects/vulnerascan/src/osv/index.ts):

- `OsvClient`: The class coordinating the queries.
- `OsvScanResult`: The final structure containing retrieved vulnerability records and scan metadata:

```typescript
export interface OsvScanResult {
  provider: string;
  vulnerabilities: RichVulnerabilityRecord[];
  metadata?: {
    timestamp: string;
    totalPackages: number;
    cacheHits: number;
    networkQueries: number;
  };
}
```

---

## Query Lifecycle & API Integration

The `OsvClient` executes scans through the following process:

### 1. Ecosystem Mapping

The mapper translates internal VulneraScan ecosystem strings to OSV-recognized values:

- `npm` -> `npm`
- `composer` -> `Packagist`
- `pip`/`poetry` -> `PyPI`
- `maven` -> `Maven`
- `go` -> `Go`
- `cargo` -> `Crates.io`
- `nuget` -> `NuGet`

### 2. Cache Inspection

Before initiating network requests, coordinates are queried against the local `VulnerabilityCache`. Hits are resolved immediately, avoiding remote calls.

### 3. Batch Querying

Any cache-miss packages are batched into groups and queried via `/v1/querybatch`. This retrieves a list of matching vulnerability IDs for all packages in a single request.

### 4. Concurrency-Limited Hydration

To retrieve complete details for each discovered vulnerability ID:

- Vulnerabilities are fetched from the `/v1/vulns/{id}` endpoint.
- Network requests are processed concurrently using a concurrency-limiting helper (`limitConcurrency`) to respect API limits and prevent socket exhaustion.

### 5. Normalization

Raw OSV API models are translated into normalized `RichVulnerabilityRecord` structures via the mapper.

---

## Cache Architecture

To protect API limits and speed up local development:

- **Cache Location**: Files are stored in a hierarchical structure under `~/.vulnerascan/cache/osv/` (e.g. `.vulnerascan/cache/osv/npm/lodash/4.17.20.json`).
- **TTL Support**: Cached entries contain timestamps. If the cache age exceeds the configured `ttlHours` (default: 24 hours), the cache is invalidated and a fresh network query is performed.

---

## Network Resilience

To handle network fluctuations, the `OsvClient` implements:

- **Exponential Backoff**: Automatic retries (up to 3 times) for server-side errors (HTTP 5xx status codes).
- **Timeouts**: An `AbortController` enforces a request timeout limit (default: 10s).
- **Graceful Degradation**: Network errors are caught and reported as warnings, preventing transient network failures from hard-crashing the entire pipeline.
