# VulneraScan — Project Overview

## What is VulneraScan?

VulneraScan is a developer-first, open-source vulnerability scanner designed for modern software projects. Its goal is to provide fast, accurate, and actionable security insights directly from the developer's terminal, without requiring cloud accounts, SaaS subscriptions, or complex configuration.

---

## Vision

> Empower every developer to understand and act on the security posture of their project, in seconds, from the terminal.

---

## Core Principles

| Principle         | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| **CLI-first**     | The primary interface is the terminal. No dashboard required for core usage. |
| **Developer UX**  | Designed for developer workflows, not security compliance teams.             |
| **Transparency**  | All data sources and scoring are documented and auditable.                   |
| **Extensibility** | A plugin architecture allows the scanner to grow with the ecosystem.         |
| **Privacy-first** | Scanning runs locally by default. No data is sent to external services.      |
| **BYOK AI**       | AI features require users to supply their own API keys.                      |

---

## Technology Stack

| Layer         | Technology                         |
| ------------- | ---------------------------------- |
| Language      | TypeScript (strict, ESM, NodeNext) |
| CLI Framework | Commander                          |
| Testing       | Vitest                             |
| Linting       | ESLint + typescript-eslint         |
| Formatting    | Prettier                           |
| Build         | tsc                                |
| CI/CD         | GitHub Actions                     |
| Package       | npm (`@hnpsaga/vulnerascan`)       |

---

## Planned Vulnerability Data Sources

- [OSV (Open Source Vulnerabilities)](https://osv.dev) — primary free source
- [NVD (National Vulnerability Database)](https://nvd.nist.gov) — supplementary
- [GitHub Security Advisories](https://github.com/advisories) — ecosystem-specific

---

## Target Language Ecosystems

| Phase | Ecosystem     |
| ----- | ------------- |
| v0.1  | Node.js / npm |
| v0.2  | Python / pip  |
| v0.3  | Java / Maven  |
| v0.4  | Java / Gradle |

---

## Development Status

| Version | Phase             | Status         |
| ------- | ----------------- | -------------- |
| v0.0.1  | Foundation        | 🔨 In Progress |
| v0.0.2  | Project Discovery | 📋 Planned     |
| v0.0.3  | Dependency Graph  | 📋 Planned     |
| v0.1.0  | Stable CLI        | 📋 Planned     |
| v0.2.0  | Local Dashboard   | 📋 Planned     |

---

## Related Documents

- [Architecture](./architecture.md)
- [Roadmap](./roadmap.md)
- [ADR-001: CLI-First Approach](./adr/001-cli-first.md)
- [ADR-002: Plugin Architecture](./adr/002-plugin-architecture.md)
- [ADR-003: Provider Layer](./adr/003-provider-layer.md)
- [ADR-004: BYOK AI](./adr/004-byok-ai.md)
