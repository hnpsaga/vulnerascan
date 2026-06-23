# Contributing to VulneraScan

Thank you for your interest in contributing to VulneraScan! This document outlines the process for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Local Development Setup](#local-development-setup)
- [Running Checks Locally](#running-checks-locally)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and collaborative environment. Harassment, discrimination, or abusive behaviour of any kind will not be tolerated.

---

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:

   ```bash
   git clone https://github.com/<your-username>/vulnerascan.git
   cd vulnerascan
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a feature branch:

   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Branch Naming

Use the following branch naming conventions:

| Type          | Pattern                        | Example                      |
| ------------- | ------------------------------ | ---------------------------- |
| Feature       | `feat/<short-description>`     | `feat/scan-command`          |
| Bug Fix       | `fix/<short-description>`      | `fix/doctor-exit-code`       |
| Documentation | `docs/<short-description>`     | `docs/update-readme`         |
| Chore         | `chore/<short-description>`    | `chore/upgrade-dependencies` |
| Refactor      | `refactor/<short-description>` | `refactor/command-structure` |
| Release       | `release/<version>`            | `release/v0.0.2`             |

---

## Commit Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                                 |
| ---------- | ------------------------------------------- |
| `feat`     | A new feature                               |
| `fix`      | A bug fix                                   |
| `docs`     | Documentation-only changes                  |
| `style`    | Formatting changes (no logic changes)       |
| `refactor` | Code changes that are not features or fixes |
| `test`     | Adding or fixing tests                      |
| `chore`    | Build, tooling, or CI changes               |
| `perf`     | Performance improvements                    |

### Examples

```
feat(cli): add doctor command with environment checks
fix(scan): handle missing package.json gracefully
docs(adr): add ADR-002 for plugin architecture
chore(ci): add Node 22 to CI matrix
```

---

## Pull Request Process

1. **Ensure all checks pass** locally before opening a PR (see [Running Checks Locally](#running-checks-locally)).
2. **Open a PR** against the `main` branch.
3. **Fill in the PR template** completely.
4. **Request a review** from the code owners.
5. **Address review comments** promptly.
6. A maintainer will merge the PR once it has been approved.

### PR Checklist

- [ ] Branch name follows the naming convention
- [ ] Commits follow Conventional Commits format
- [ ] All CI checks pass
- [ ] Documentation has been updated (if applicable)
- [ ] Tests have been added or updated (if applicable)

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 8

### Installation

```bash
# Clone the repository
git clone https://github.com/hnpsaga/vulnerascan.git
cd vulnerascan

# Install dependencies
npm install
```

### Running the CLI locally

```bash
npm run dev -- <command>

# Examples:
npm run dev -- version
npm run dev -- doctor
npm run dev -- scan
```

---

## Running Checks Locally

Before submitting a PR, ensure all checks pass:

```bash
# Check code formatting
npm run format:check

# Auto-fix formatting issues
npm run format

# Run linter
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Run TypeScript type checking
npm run typecheck

# Run tests
npm run test

# Build the project
npm run build
```

All checks must pass with zero errors before opening a PR.
