# ADR-001: CLI-First Approach

## Status

Accepted

## Date

2026-06-23

## Context

VulneraScan needs a primary interface through which developers interact with the tool. The two primary options are:

1. **CLI-first**: Build the terminal interface as the primary product. Add a dashboard later.
2. **Dashboard-first**: Build a web-based UI as the primary interface from the start.

## Decision

We adopt a **CLI-first** approach. The terminal interface is the primary and initially the only interface for VulneraScan.

## Rationale

### Developer Workflow Integration

Developers already live in the terminal. A CLI tool integrates naturally into existing workflows without requiring context switching to a browser. Security scans can be run inline during development, in pre-commit hooks, and in CI pipelines.

### CI/CD Compatibility

A CLI with predictable exit codes is trivially composable into CI/CD pipelines (GitHub Actions, GitLab CI, CircleCI, Jenkins). A dashboard-first approach would require a separate CLI adapter later, creating redundant work.

### Reduced Initial Complexity

Building a web dashboard requires frontend framework decisions, a local server, state management, and a build pipeline. A CLI requires only Node.js. Starting CLI-first reduces the surface area and allows us to ship a useful product sooner.

### Iteration Speed

CLI commands can be iterated on rapidly. Adding a new flag or subcommand takes minutes. Building an equivalent UI feature takes hours.

### Precedent

The most successful developer security tools (Snyk CLI, Trivy, OWASP Dependency-Check, npm audit) are CLI-first tools. The CLI is the primary trust surface.

## Consequences

- The `scan`, `doctor`, and `version` commands form the core CLI interface.
- A local dashboard will be introduced in v0.2.0, **after** the CLI is stable.
- All features must be accessible via CLI before any dashboard equivalent is considered.
- Exit codes are a first-class concern to support CI/CD integration.

## Alternatives Considered

| Alternative     | Rejected Because                                             |
| --------------- | ------------------------------------------------------------ |
| Dashboard-first | High upfront complexity, poor CI/CD compatibility            |
| API-first       | Requires a running server, too complex for local dev tooling |
| GUI application | Platform-specific, poor portability                          |
