# VulneraScan

Developer-first vulnerability scanner for modern software projects.

[![CI](https://github.com/hnpsaga/vulnerascan/actions/workflows/ci.yml/badge.svg)](https://github.com/hnpsaga/vulnerascan/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@hnpsaga/vulnerascan)](https://www.npmjs.com/package/@hnpsaga/vulnerascan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is VulneraScan?

VulneraScan is an open-source, developer-first vulnerability scanner designed to run entirely locally. It parses project dependency manifests, builds structured dependency graphs, queries open vulnerability feeds (such as the Google OSV database), and identifies security findings directly in the developer terminal or a local browser-based dashboard.

---

## Why use VulneraScan?

- **Privacy-first**: All package dependency resolution and vulnerability checks are executed locally. No source code or proprietary graphs are uploaded to third-party servers.
- **Fast and Cached**: A built-in local cache with time-to-live settings minimizes network query delays.
- **Ecosystem Portable**: Standardized schema models support multi-language environments (Node.js, PHP, Python, Java, Go, Rust, .NET).
- **CI/CD Integrations**: Standard exits and formats (SARIF, CycloneDX) ease compliance validation in workflows.

---

## Installation

Install globally using npm:

```bash
npm install -g @hnpsaga/vulnerascan
```

Or execute directly on demand using `npx`:

```bash
npx @hnpsaga/vulnerascan --help
```

---

## Quick Start

1. **Verify your setup**:
   ```bash
   vulnerascan doctor
   ```
2. **Scan a repository**:
   ```bash
   vulnerascan scan
   ```
3. **Launch the Local Dashboard**:
   ```bash
   vulnerascan dashboard
   ```

---

## Learn More

For deeper documentation, browse our topics:

- [Architecture & Design](file:///home/hnpsaga/projects/vulnerascan/docs/architecture/README.md) — Directory layouts, scan pipeline mechanics, and provider abstraction layers.
- [CLI Reference](file:///home/hnpsaga/projects/vulnerascan/docs/cli/README.md) — Options and examples for `doctor`, `scan`, and other commands.
- [Local Dashboard](file:///home/hnpsaga/projects/vulnerascan/docs/dashboard/README.md) — Aggregated views and dependency pathways.
- [Workspace Schema](file:///home/hnpsaga/projects/vulnerascan/docs/workspace/README.md) — Local directory structure for workspace metadata and run timeline history.
- [Ecosystem Support](file:///home/hnpsaga/projects/vulnerascan/docs/ecosystems/README.md) — Supported language files and manifest rules.
- [Report Formats & Exports](file:///home/hnpsaga/projects/vulnerascan/docs/reports/README.md) — Details on generated run artifacts and format exporters (SARIF, CycloneDX, SPDX).
- [Contributor & Developer Guide](file:///home/hnpsaga/projects/vulnerascan/docs/development/README.md) — Setup guidelines, branch conventions, and compliance test commands.
- [Security Policy](file:///home/hnpsaga/projects/vulnerascan/SECURITY.md) — Instructions for submitting security vulnerabilities.
- [License details](file:///home/hnpsaga/projects/vulnerascan/LICENSE) — MIT License info.
