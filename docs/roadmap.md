# VulneraScan — Roadmap

## Philosophy

VulneraScan is built incrementally. Each release delivers a usable, stable slice of functionality.

---

## Release History

### v0.0.0 — Name Reservation

- Published `@hnpsaga/vulnerascan` to npm
- Minimal CLI with version flag

---

## Released

### v0.0.1 — Foundation

**Goal**: Establish repository standards, CLI framework, and development tooling.

| Item                              | Status  |
| --------------------------------- | ------- |
| CLI framework (Commander)         | ✅ Done |
| `version` command                 | ✅ Done |
| `doctor` command                  | ✅ Done |
| `scan` placeholder command        | ✅ Done |
| TypeScript strict mode + ESM      | ✅ Done |
| ESLint + typescript-eslint        | ✅ Done |
| Prettier formatting               | ✅ Done |
| Vitest test suite                 | ✅ Done |
| GitHub Actions CI                 | ✅ Done |
| Release workflow                  | ✅ Done |
| ADR documentation                 | ✅ Done |
| CONTRIBUTING, SECURITY guidelines | ✅ Done |

### v0.0.2 — Foundation (patch)

**Goal**: Patch release with foundational improvements.

| Item             | Status  |
| ---------------- | ------- |
| Publish v0.0.2   | ✅ Done |
| Internal cleanup | ✅ Done |

### v0.0.3 — Project Discovery _(current)_

**Goal**: Detect project manifests and identify the ecosystem.

| Item                          | Status    |
| ----------------------------- | --------- |
| Detect `package.json`         | ✅ Done   |
| Detect `pom.xml`              | ✅ Done   |
| Detect `build.gradle`         | ✅ Done   |
| Detect `build.gradle.kts`     | ✅ Done   |
| Detect `requirements.txt`     | ✅ Done   |
| Detect `pyproject.toml`       | ✅ Done   |
| Report detected ecosystem     | ✅ Done   |
| Recursive workspace discovery | 📋 Future |

---

## Upcoming Releases

### v0.0.4 — Dependency Graph

**Goal**: Parse manifests and build a resolved dependency graph.

| Item                            | Status     |
| ------------------------------- | ---------- |
| npm dependency resolution       | 📋 Planned |
| Transitive dependency traversal | 📋 Planned |
| Dependency graph output (JSON)  | 📋 Planned |

---

### v0.1.0 — Stable CLI

**Goal**: Full vulnerability scanning against OSV and NVD for npm projects.

| Item                              | Status     |
| --------------------------------- | ---------- |
| OSV provider integration          | 📋 Planned |
| NVD provider integration          | 📋 Planned |
| CVSS scoring                      | 📋 Planned |
| Vulnerability report (terminal)   | 📋 Planned |
| Exit code policy (CI integration) | 📋 Planned |
| `--format json` output            | 📋 Planned |

---

### v0.2.0 — Local Dashboard

**Goal**: Browser-based local security dashboard.

| Item                           | Status     |
| ------------------------------ | ---------- |
| Local web server               | 📋 Planned |
| Scan history                   | 📋 Planned |
| Vulnerability drill-down views | 📋 Planned |
| Remediation suggestions        | 📋 Planned |

---

### v0.3.0 — AI Remediation

**Goal**: AI-assisted remediation insights with BYOK model.

| Item                      | Status     |
| ------------------------- | ---------- |
| BYOK AI key management    | 📋 Planned |
| AI remediation summaries  | 📋 Planned |
| Fix suggestion generation | 📋 Planned |

---

## Long-Term Vision

- Multi-ecosystem support (Maven, Gradle, Python, Rust, Go)
- Plugin marketplace
- IDE integrations (VS Code, JetBrains)
- CI/CD native integrations (GitHub Actions marketplace action)
