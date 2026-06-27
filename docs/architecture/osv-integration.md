# OSV Integration

VulneraScan uses the Open Source Vulnerability (OSV) database as its primary source of vulnerability information.

The OSV integration subsystem is responsible for retrieving vulnerability data, normalizing advisory information, caching responses, and providing a consistent interface to the vulnerability detection pipeline.

This separation allows the remainder of the application to operate independently of the underlying vulnerability provider.

---

# Role in the Scan Pipeline

The OSV subsystem sits between dependency resolution and vulnerability detection.

```text
Project
    │
    ▼
Dependency Resolution
    │
    ▼
Dependency Graph
    │
    ▼
OSV Integration
    │
    ▼
Vulnerability Detection
    │
    ▼
Reports, Exporters & Dashboard
```

The dependency graph identifies the packages and versions used by the project.

The OSV subsystem retrieves vulnerability information for those packages and transforms it into VulneraScan's internal representation before passing it to the vulnerability detector.

---

# Responsibilities

The OSV integration layer has five primary responsibilities.

| Responsibility         | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Coordinate Translation | Converts dependency information into OSV-compatible package coordinates.                  |
| Request Processing     | Groups package queries into efficient batch requests.                                     |
| Response Normalization | Converts OSV responses into VulneraScan's internal vulnerability model.                   |
| Caching                | Stores previously retrieved vulnerability information locally to reduce network requests. |
| Error Isolation        | Prevents network or API failures from affecting the remainder of the scan pipeline.       |

---

# Data Flow

Every scan follows the same OSV integration workflow.

```text
Dependency Graph
        │
        ▼
Package Coordinates
        │
        ▼
Local Cache
        │
   ┌────┴────┐
   │         │
Cache Hit  Cache Miss
   │         │
   │     OSV Requests
   │         │
   └────┬────┘
        ▼
Response Normalization
        ▼
Vulnerability Records
        ▼
Vulnerability Detection
```

Only package metadata required to identify dependencies is sent to the OSV API.

Project source code, manifests, and repository contents never leave the local machine.

---

# Request Processing

Package coordinates extracted from the dependency graph are translated into the format expected by the OSV API.

To reduce network overhead, VulneraScan groups multiple package queries into batch requests before sending them to the remote service.

Once advisory identifiers are returned, detailed advisory information is retrieved, normalized, and associated with the corresponding package coordinates.

This process is transparent to the remainder of the scan pipeline.

---

# Response Processing

Responses from the OSV API are validated before being processed.

The OSV subsystem transforms advisory data into a normalized internal representation that is independent of the external API schema.

Normalization includes:

* advisory metadata
* affected packages
* version information
* references
* severity information
* publication timestamps

The vulnerability detection subsystem consumes only this normalized representation and does not depend directly on the OSV API.

---

# Local Cache

To improve performance and reduce unnecessary network traffic, VulneraScan maintains a local cache of vulnerability information.

The cache provides several benefits:

* Faster repeated scans.
* Reduced API requests.
* Improved resilience during intermittent network issues.

Cache entries automatically expire after a configurable period.

If an entry has expired, VulneraScan transparently retrieves fresh vulnerability information from the OSV service.

Cache write failures do not interrupt scans.

---

# Configuration

The OSV subsystem supports a small set of public configuration options.

## Environment Variables

| Variable                  | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `VULNERASCAN_HOME`        | Overrides the location of the VulneraScan workspace and cache. |
| `VULNERASCAN_OSV_API_URL` | Uses an alternative OSV-compatible API endpoint.               |

## Configuration File

The local configuration file allows contributors and users to configure cache behaviour.

Supported options include:

* enabling or disabling the cache
* configuring cache lifetime

These settings affect only the OSV integration subsystem.

---

# Error Handling

The OSV integration layer is designed to isolate external failures from the remainder of the application.

It provides:

* request timeouts
* automatic retries for transient failures
* graceful handling of partial failures
* normalized error reporting

When possible, scans continue even if individual advisory requests fail.

This allows VulneraScan to produce useful results instead of terminating the entire scan because of a temporary network issue.

---

# Design Principles

## Privacy First

Only dependency coordinates are transmitted to the OSV API.

Project source code, manifests, reports, and workspace data remain on the local machine.

---

## Provider Independence

The remainder of the application depends on VulneraScan's normalized vulnerability model rather than the OSV API directly.

This keeps reporting, exporters, and vulnerability detection isolated from provider-specific schemas.

---

## Performance

Batch requests and local caching reduce network overhead while maintaining consistent scan behaviour.

---

## Resilience

Network failures are contained within the OSV subsystem and do not propagate through the rest of the architecture.

---

# Extending the Integration

Contributors modifying the OSV subsystem should preserve the separation between:

* dependency resolution
* provider communication
* vulnerability normalization
* vulnerability detection

Keeping these responsibilities independent ensures changes to provider communication do not affect reporting, exporters, or dashboard functionality.

---

# Current Limitations

The current implementation has several known architectural limitations.

* Package coordinates are transmitted in plaintext over HTTPS, as required by the OSV API.
* Request batching and advisory retrieval concurrency use fixed implementation limits.
* Cached entries expire based on time and are refreshed on demand rather than being proactively cleaned up.
* If a batch request fails, the affected batch is retried as a whole rather than being subdivided into smaller requests.

These limitations are implementation characteristics rather than architectural constraints.

---

# Related Documentation

For additional information, see:

* **Architecture Overview** — Overall system architecture.
* **Dependency Graph** — Canonical dependency model consumed by the OSV subsystem.
