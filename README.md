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

For full installation options and requirements, see the [Installation Guide](file:///home/hnpsaga/projects/vulnerascan/docs/getting-started/installation.md).

Install globally using npm:

```bash
npm install -g @hnpsaga/vulnerascan
```

---

## Quick Start

For detailed step-by-step instructions, see the [Quick Start Guide](file:///home/hnpsaga/projects/vulnerascan/docs/getting-started/quick-start.md).

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

Explore our detailed documentation sections:

- **[Getting Started](file:///home/hnpsaga/projects/vulnerascan/docs/getting-started/quick-start.md)**: Jump in with [Installation](file:///home/hnpsaga/projects/vulnerascan/docs/getting-started/installation.md) and [Quick Start](file:///home/hnpsaga/projects/vulnerascan/docs/getting-started/quick-start.md).
- **[CLI Reference](file:///home/hnpsaga/projects/vulnerascan/docs/cli/README.md)**: Explore the command-line interface commands and options.
- **[Dashboard](file:///home/hnpsaga/projects/vulnerascan/docs/dashboard/README.md)**: Learn about the interactive local web dashboard.
- **[Workspace Schema](file:///home/hnpsaga/projects/vulnerascan/docs/workspace/README.md)**: Understand the directory structure and metadata layouts.
- **[Reports](file:///home/hnpsaga/projects/vulnerascan/docs/reports/README.md)**: Details on run output files and formats.
- **[Exporters](file:///home/hnpsaga/projects/vulnerascan/docs/exporters/README.md)**: Info on exporting formats like SARIF, CycloneDX, and SPDX.
- **[Supported Ecosystems](file:///home/hnpsaga/projects/vulnerascan/docs/ecosystems/supported-ecosystems.md)**: Check supported package managers and manifest specifications.
- **[Architecture & Design](file:///home/hnpsaga/projects/vulnerascan/docs/architecture/README.md)**: Deep dive into the pipeline architecture and [OSV Integration](file:///home/hnpsaga/projects/vulnerascan/docs/architecture/osv-integration.md).
- **[Development](file:///home/hnpsaga/projects/vulnerascan/docs/development/README.md)**: Set up local development and view the project [Roadmap](file:///home/hnpsaga/projects/vulnerascan/docs/development/roadmap.md).
- **[Examples](file:///home/hnpsaga/projects/vulnerascan/docs/examples/node.md)**: Access language-specific scan configurations and samples:
  - [Node.js](file:///home/hnpsaga/projects/vulnerascan/docs/examples/node.md)
  - [Java](file:///home/hnpsaga/projects/vulnerascan/docs/examples/java.md)
  - [Python](file:///home/hnpsaga/projects/vulnerascan/docs/examples/python.md)
  - [Go](file:///home/hnpsaga/projects/vulnerascan/docs/examples/go.md)
  - [Rust](file:///home/hnpsaga/projects/vulnerascan/docs/examples/rust.md)
  - [.NET](file:///home/hnpsaga/projects/vulnerascan/docs/examples/dotnet.md)
  - [PHP](file:///home/hnpsaga/projects/vulnerascan/docs/examples/php.md)

---

- [Security Policy](file:///home/hnpsaga/projects/vulnerascan/SECURITY.md) — Instructions for submitting security vulnerabilities.
- [License details](file:///home/hnpsaga/projects/vulnerascan/LICENSE) — MIT License info.
