# VulneraScan Roadmap

This document outlines the current project status, high-level direction, and plans leading to v1.0 and beyond.

---

## Current Project Status

VulneraScan is structured as a modular vulnerability scanner featuring:

- **Workspace & Registry management** to track projects and scans globally.
- **Ecosystem dependency resolution** (currently supporting Node.js/npm and PHP/Composer).
- **Dedicated OSV integration** using batch queries and parallel HTTP requests, combined with a local filesystem cache with configurable TTL.
- **Ecosystem-specific semantic version matching** (e.g. Node SemVer).
- **Report exporting capabilities** and a backend aggregation dashboard service.

---

## High-Level Future Direction

Our ultimate goal is to provide a language-agnostic, fast, local-first dependency vulnerability scanner that works seamlessly across CLI, dashboard UI, and CI/CD pipelines. We prioritize modular isolation, strict data normalization, and local cache resilience to avoid unnecessary network round-trips.

---

## Remaining Work before v1.0

- **Ecosystem Expansion**:
  - Implement dependency resolution, version matchers, and mappings for Java (Maven), Python (pip/poetry), Go (modules), Rust (Cargo), and .NET (NuGet).
- **Dashboard UI**:
  - Fully integrate the web dashboard user interface with the aggregation service.
- **Reporting & Exporters**:
  - Enhance vulnerability reports with advanced exporter formats (HTML, PDF).
  - Implement export profiles for CI/CD gates.
- **Performance & Reliability**:
  - Support parallel scanning across multiple local workspaces.
  - Optimize memory usage on extremely large dependency trees.

---

## Future Ideas (Post v1.0)

- **Automated Remediation**:
  - Offer automatic dependency upgrading and patch recommendations based on lockfile compatibility analysis.
- **Background Scanner Daemon**:
  - Introduce an optional background scanner that monitors repository changes in real-time.
- **CI/CD Integrations**:
  - Official GitHub Action, GitLab CI template, and pre-built Docker containers.
- **Integrations with Private Registries**:
  - Add authorization support for scanning private packages and custom vulnerability sources.
