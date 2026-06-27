# Architecture Overview

This document provides a high-level overview of the VulneraScan architecture.

It is intended for contributors who want to understand how the system is organized before making changes to the codebase.

Rather than focusing on implementation details, this guide explains the responsibilities of each subsystem, how they collaborate, and how data flows through the application.

---

# Design Goals

VulneraScan is built around a small set of architectural principles that shape every subsystem.

## CLI First

The command-line interface is the primary entry point into the application.

All major functionality—including scanning, exporting reports, running diagnostics, and launching the dashboard—is exposed through a consistent CLI experience.

## Privacy First

All scanning occurs locally.

Project source code, dependency information, scan history, and generated reports remain on the user's machine. Vulnerability information is retrieved from the Open Source Vulnerability (OSV) database, but project files are never uploaded.

## Workspace Based

Every scan is executed within an isolated workspace managed by VulneraScan.

This allows scan history, generated reports, cached data, and dashboard information to be preserved without modifying the user's project.

## Modular

Each major responsibility is implemented as an independent subsystem with well-defined boundaries.

This keeps the codebase maintainable while making it easier to add support for new ecosystems, exporters, and reporting formats.

---

# System Architecture

The application is organized into several major subsystems.

| Subsystem               | Responsibility                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------- |
| CLI                     | Parses commands and coordinates application workflows.                              |
| Project Discovery       | Detects the project ecosystem and identifies supported manifests.                   |
| Dependency Resolution   | Builds a dependency graph for the detected project.                                 |
| OSV Integration         | Retrieves vulnerability information from the Open Source Vulnerability database.    |
| Vulnerability Detection | Matches resolved dependencies against known vulnerabilities.                        |
| Reporting               | Produces human-readable and machine-readable reports.                               |
| Exporters               | Generates standard security formats such as SARIF, CycloneDX, SPDX, and AI Context. |
| Workspace               | Stores scan history, reports, project metadata, and cached information.             |
| Dashboard               | Presents workspace data through a browser-based interface.                          |

Each subsystem has a single responsibility and communicates with neighboring subsystems through well-defined domain models.

---

# End-to-End Scan Flow

A typical scan follows this sequence:

```text
CLI
 │
 ▼
Project Discovery
 │
 ▼
Dependency Resolution
 │
 ▼
OSV Integration
 │
 ▼
Vulnerability Detection
 │
 ├────────────► Reports & Exporters
 │
 ▼
Workspace
 │
 ▼
Dashboard
```

The workflow begins when the user executes `vulnerascan scan`.

The project is first analyzed to determine its ecosystem. Dependencies are then resolved into a dependency graph, which is used to query the OSV database for known vulnerabilities. The resulting findings are transformed into reports, persisted within the local workspace, and made immediately available through the dashboard.

Each stage focuses on a single responsibility, making the overall pipeline easier to understand, test, and extend.

---

# Project Organization

The repository is organized around architectural responsibilities rather than programming language features.

| Directory    | Purpose                              |
| ------------ | ------------------------------------ |
| `src/`       | Core application source code.        |
| `dashboard/` | Browser-based dashboard application. |
| `tests/`     | Unit and integration tests.          |
| `docs/`      | User and developer documentation.    |
| `dist/`      | Generated build artifacts.           |

Within `src/`, related functionality is grouped into dedicated modules such as discovery, dependency resolution, vulnerability detection, reporting, exporters, and workspace management.

---

# Data Flow

The primary data flow through VulneraScan is straightforward.

```text
Project
    │
    ▼
Dependency Graph
    │
    ▼
OSV Vulnerability Data
    │
    ▼
Vulnerability Findings
    │
    ▼
Reports & Exporters
    │
    ▼
Workspace
    │
    ▼
Dashboard
```

Each stage transforms data into a more useful representation without modifying the original project.

This separation allows reports, exports, and the dashboard to share a common source of truth.

---

# Workspace Model

The workspace is a central architectural component.

Rather than operating directly inside the user's project, VulneraScan maintains an isolated workspace where it stores:

* project metadata
* scan history
* generated reports
* exported artifacts
* cached vulnerability information

Using a dedicated workspace provides several advantages:

* Scan history is preserved across executions.
* Reports can be regenerated without rescanning.
* Dashboard data remains available between sessions.
* Projects are never modified during analysis.

---

# Dashboard Integration

The dashboard is a visualization layer built on top of the workspace.

It does not perform vulnerability scanning itself.

Instead, it presents information already produced by previous scans, including:

* registered projects
* scan history
* vulnerability summaries
* dependency statistics
* generated reports

Because the dashboard consumes existing workspace data, every successful scan becomes available immediately without any additional import or synchronization step.

---

# Extending VulneraScan

The architecture is designed to make future enhancements straightforward.

Common extension areas include:

| Area              | Typical Changes                                                      |
| ----------------- | -------------------------------------------------------------------- |
| Ecosystem Support | Add project detection and dependency resolution for a new ecosystem. |
| Report Formats    | Add new human-readable reports.                                      |
| Export Formats    | Implement additional machine-readable export standards.              |
| Dashboard         | Introduce new visualizations and analysis views.                     |

The modular architecture allows these capabilities to evolve independently while preserving the overall scan pipeline.

---

# Architectural Boundaries

The current architecture intentionally focuses on local dependency vulnerability analysis.

It does not include:

* cloud-hosted services
* remote project synchronization
* automatic dependency upgrades
* automatic code remediation
* user authentication or multi-user collaboration
* external database servers

Keeping the architecture local-first reduces operational complexity while preserving privacy and making VulneraScan easy to use in both developer workstations and CI/CD environments.

---

# Related Documentation

This document provides the architectural overview.

The following documents describe individual subsystems in greater detail:

* **Dependency Graph** – Structure and lifecycle of the dependency graph.
* **OSV Integration** – Communication with the Open Source Vulnerability database and caching strategy.

Contributors are encouraged to begin with this overview before exploring subsystem-specific documentation.
