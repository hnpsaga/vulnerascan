# VulneraScan

A privacy-first, multi-ecosystem dependency vulnerability scanner powered by the Open Source Vulnerability (OSV) database.

VulneraScan helps developers discover known dependency vulnerabilities early in the software development lifecycle while keeping scans local and producing standardized outputs for both developers and security tooling.

## Why VulneraScan?

Modern software projects depend on hundreds or even thousands of third-party packages. Tracking vulnerabilities across those dependencies can quickly become difficult, especially when working with multiple programming languages and build systems.

VulneraScan was created to provide a simple, transparent, and extensible way to identify known vulnerabilities while remaining completely local-first.

### Key Principles

* **Privacy First** — Project source code and dependency graphs remain on your machine.
* **Multi-Ecosystem** — Scan projects across multiple programming language ecosystems through a unified workflow.
* **Consistent Results** — Every supported ecosystem produces the same normalized dependency and vulnerability models.
* **Developer Friendly** — Command-line interface, browser dashboard, machine-readable reports, and security export formats.
* **Open Source** — Built on open standards and the OSV vulnerability database.

---

## Where VulneraScan Fits

VulneraScan is designed to be the **first line of dependency vulnerability detection** during software development.

It helps developers identify known vulnerabilities early, understand their dependency graph, and take action before code reaches production.

Typical workflows include:

* Running scans locally before committing changes.
* Integrating scans into CI/CD pipelines.
* Reviewing dependency health through the built-in dashboard.
* Exporting results to security tooling using formats such as SARIF and CycloneDX.

VulneraScan is intentionally focused on dependency vulnerability analysis. It does **not** attempt to replace enterprise application security platforms.

Organizations that require capabilities such as centralized policy management, organization-wide governance, compliance reporting, license management, or commercial security workflows can use VulneraScan alongside those platforms.

By producing standardized outputs and security export formats, VulneraScan integrates naturally into larger security ecosystems while remaining lightweight, transparent, and developer-friendly.

---

## Features

* Dependency discovery across multiple ecosystems.
* Automatic dependency graph generation.
* Vulnerability detection using the Open Source Vulnerability (OSV) database.
* Local workspace with historical scan results.
* Browser-based dashboard for exploring projects and scan history.
* Multiple report formats:

  * JSON
  * Markdown
  * CSV
* Security exports:

  * SARIF
  * CycloneDX
  * SPDX
* AI-friendly context exports for LLM-assisted analysis.

---

## Supported Ecosystems

VulneraScan currently supports multiple programming language ecosystems through a common scanning pipeline.

For the latest compatibility matrix, supported dependency managers, and current limitations, see:

**→ `docs/ecosystems/supported-ecosystems.md`**

---

## Installation

### npm

```bash
npm install -g @hnpsaga/vulnerascan
```

### Docker

Docker installation instructions are available in:

**→ `docs/getting-started/installation.md`**

---

## Quick Start

Scan the current project:

```bash
vulnerascan scan
```

Scan another project:

```bash
vulnerascan scan --path /path/to/project
```

Launch the dashboard:

```bash
vulnerascan dashboard
```

For a complete walkthrough, see:

**→ `docs/getting-started/quick-start.md`**

---

## Documentation

### Getting Started

* Installation
* First Scan
* Dashboard

### User Guide

* CLI Reference
* Dashboard
* Workspace
* Reports
* Exporters
* Supported Ecosystems

### Architecture

* System Architecture
* Dependency Graph
* OSV Integration

### Development

* Contributing
* Security Policy

---

## Documentation Index

| Document                                  | Description                       |
| ----------------------------------------- | --------------------------------- |
| `docs/getting-started/installation.md`    | Installation instructions         |
| `docs/getting-started/quick-start.md`     | First scan walkthrough            |
| `docs/cli/README.md`                      | Complete CLI reference            |
| `docs/dashboard/README.md`                | Dashboard usage                   |
| `docs/workspace/README.md`                | Workspace layout and data storage |
| `docs/reports/README.md`                  | Report formats                    |
| `docs/exporters/README.md`                | Security and AI export formats    |
| `docs/ecosystems/supported-ecosystems.md` | Supported ecosystems              |
| `docs/architecture/README.md`             | Architecture overview             |
| `CONTRIBUTING.md`                         | Contributor guide                 |
| `SECURITY.md`                             | Security policy                   |

---

## Project Philosophy

VulneraScan is designed around a simple principle:

> Scan locally. Normalize consistently. Present results clearly.

The scanning pipeline separates project discovery, dependency resolution, vulnerability matching, reporting, dashboard presentation, and export generation into independent modules. This architecture keeps the project maintainable while making it easier to add support for new ecosystems over time.

---

## Contributing

Contributions are welcome.

If you'd like to contribute, start with:

**→ `CONTRIBUTING.md`**

---

## Security

If you discover a security vulnerability, please follow the process described in:

**→ `SECURITY.md`**

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.
