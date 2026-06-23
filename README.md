# VulneraScan

Developer-first vulnerability scanner for modern software projects.

[![CI](https://github.com/hnpsaga/vulnerascan/actions/workflows/ci.yml/badge.svg)](https://github.com/hnpsaga/vulnerascan/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@hnpsaga/vulnerascan)](https://www.npmjs.com/package/@hnpsaga/vulnerascan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Status

🔨 **v0.0.1 — Foundation**

The CLI framework, tooling, and repository standards are in place. Vulnerability scanning functionality is coming in v0.0.2.

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

| Command               | Description                                   |
| --------------------- | --------------------------------------------- |
| `vulnerascan`         | Display help information                      |
| `vulnerascan version` | Print the current version                     |
| `vulnerascan doctor`  | Check environment health and configuration    |
| `vulnerascan scan`    | Scan for vulnerabilities _(coming in v0.0.2)_ |

### `vulnerascan version`

```
VulneraScan v0.0.1
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

```
Scanning functionality coming in v0.0.2
```

---

## Development Status

| Version | Phase             | Status         |
| ------- | ----------------- | -------------- |
| v0.0.1  | Foundation        | 🔨 In Progress |
| v0.0.2  | Project Discovery | 📋 Planned     |
| v0.0.3  | Dependency Graph  | 📋 Planned     |
| v0.1.0  | Stable CLI        | 📋 Planned     |
| v0.2.0  | Local Dashboard   | 📋 Planned     |
| v0.3.0  | AI Remediation    | 📋 Planned     |

See the full [Roadmap](./docs/roadmap.md) for details.

---

## Planned Features

- 🔍 Dependency discovery across multiple ecosystems
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
