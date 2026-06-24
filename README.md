# VulneraScan

Developer-first vulnerability scanner for modern software projects.

[![CI](https://github.com/hnpsaga/vulnerascan/actions/workflows/ci.yml/badge.svg)](https://github.com/hnpsaga/vulnerascan/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@hnpsaga/vulnerascan)](https://www.npmjs.com/package/@hnpsaga/vulnerascan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Status

✅ **v0.0.3 — Project Discovery**

Project detection across multiple ecosystems is implemented.

---

## Installation

```bash
npm install -g @hnpsaga/vulnerascan
```

or run without installing:

```bash
npx @hnpsaga/vulnerascan --help
```

---

## Commands

| Command               | Description                                      |
| --------------------- | ------------------------------------------------ |
| `vulnerascan`         | Display help information                         |
| `vulnerascan version` | Print the current version                        |
| `vulnerascan doctor`  | Check environment health and configuration       |
| `vulnerascan scan`    | Detect project type and scan for vulnerabilities |

### `vulnerascan version`

```
VulneraScan v0.0.3
```

### `vulnerascan doctor`

Checks your environment and creates the configuration directory if missing:

```
Running VulneraScan doctor checks...

✔ Node version (v20.0.0 (minimum: v18))
✔ Platform (linux)
✔ CLI installed (vulnerascan is reachable)
✔ Configuration directory accessible (~/.vulnerascan)

All checks passed. VulneraScan is ready.
```

### `vulnerascan scan`

Detects the project type and identifies the manifest file:

```
$ vulnerascan scan
Project Type: Node.js
Manifest: package.json
```

#### Supported ecosystems

| Ecosystem | Manifest(s)                           |
| --------- | ------------------------------------- |
| Node.js   | `package.json`                        |
| Maven     | `pom.xml`                             |
| Gradle    | `build.gradle` / `build.gradle.kts`   |
| Python    | `requirements.txt` / `pyproject.toml` |

If no supported project type is detected, the command exits with code 1:

```
$ vulnerascan scan
No supported project type detected.
```

---

## Local Workspaces

VulneraScan stores scan history locally:

`~/.vulnerascan/workspaces/`

Each project receives a workspace.

Each scan creates a run.

All data remains local.

---

## Dependency Resolution

VulneraScan performs dependency resolution in an isolated local workspace.

The source repository is never modified.

If a lockfile is missing, VulneraScan generates one inside the workspace and uses it for analysis.

---

## Development Status

| Version | Phase             | Status      |
| ------- | ----------------- | ----------- |
| v0.0.1  | Foundation        | ✅ Released |
| v0.0.2  | Foundation        | ✅ Released |
| v0.0.3  | Project Discovery | ✅ Released |
| v0.0.4  | Dependency Graph  | 📋 Planned  |
| v0.1.0  | Stable CLI        | 📋 Planned  |
| v0.2.0  | Local Dashboard   | 📋 Planned  |
| v0.3.0  | AI Remediation    | 📋 Planned  |

See the full [Roadmap](./docs/roadmap.md) for details.

---

## Planned Features

- 🔍 Dependency graph generation
- 📊 Dependency graph generation
- 🛡️ Vulnerability detection via OSV, NVD, and GitHub Advisories
- 🌍 Multi-language support (Node.js, Python, Maven, Gradle)
- 🤖 AI-assisted remediation insights (BYOK)
- 🖥️ Local security dashboard

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on branch naming, commit conventions, and the PR process.

---

## Security

To report a security vulnerability, please follow the [responsible disclosure process](./SECURITY.md). Do not open public GitHub issues for security reports.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
