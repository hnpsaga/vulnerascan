# Contributing to VulneraScan

Thank you for your interest in contributing to VulneraScan.

Whether you're fixing a bug, improving documentation, adding ecosystem support, or proposing a new feature, contributions are welcome.

---

# Development Requirements

Before contributing, ensure your development environment includes:

* Node.js 18 or later
* npm 8 or later
* Git

Development is supported on:

* Linux
* macOS
* Windows

---

# Repository Setup

Clone the repository and install dependencies.

```bash
git clone <repository-url>
cd vulnerascan

npm install
npm install --prefix dashboard
```

Build the project:

```bash
npm run build
```

Verify the development environment:

```bash
npm run dev -- --help
```

---

# Development Commands

## Root Project

| Command                  | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `npm run build`          | Build the CLI and production dashboard.             |
| `npm run dev`            | Run the CLI directly from the TypeScript source.    |
| `npm run lint`           | Run ESLint.                                         |
| `npm run lint:fix`       | Automatically fix lint issues where possible.       |
| `npm run format`         | Format the repository using Prettier.               |
| `npm run format:check`   | Verify formatting.                                  |
| `npm run typecheck`      | Run the TypeScript compiler without emitting files. |
| `npm test`               | Execute the test suite.                             |
| `npm run licenses:check` | Verify production dependency licenses.              |

## Dashboard

Dashboard development is isolated in the `dashboard` directory.

| Command                              | Purpose                                   |
| ------------------------------------ | ----------------------------------------- |
| `npm run dev --prefix dashboard`     | Start the dashboard development server.   |
| `npm run build --prefix dashboard`   | Build the production dashboard.           |
| `npm run lint --prefix dashboard`    | Run ESLint for the dashboard project.     |
| `npm run preview --prefix dashboard` | Preview the production dashboard locally. |

---

# Testing

Before submitting a pull request, run the complete validation suite:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run licenses:check
npm run build
```

All commands should complete successfully before opening a pull request.

---

# Branch Naming

Create a dedicated branch for every change.

Recommended prefixes include:

* `feat/` – New features
* `fix/` – Bug fixes
* `docs/` – Documentation
* `refactor/` – Internal improvements
* `chore/` – Tooling and maintenance
* `release/` – Release preparation

Keep each branch focused on a single change.

---

# Commit Messages

Use Conventional Commits.

Examples:

```text
feat: add support for new ecosystem

fix: resolve dashboard startup issue

docs: improve installation guide

refactor: simplify dependency resolution
```

---

# Pull Requests

When submitting a pull request:

* Target the `main` branch.
* Keep the scope focused on a single logical change.
* Update documentation when user-facing behaviour changes.
* Add or update tests when appropriate.
* Ensure the complete validation suite passes before requesting review.

---

# Project Structure

The repository is organized into a small number of top-level components.

| Directory    | Purpose                                     |
| ------------ | ------------------------------------------- |
| `src/`       | CLI implementation and core scanning logic. |
| `dashboard/` | Browser-based dashboard application.        |
| `tests/`     | Unit and integration tests.                 |
| `docs/`      | User and developer documentation.           |
| `dist/`      | Generated build output.                     |

---

# Code Quality

Every contribution is expected to satisfy the project's quality standards.

This includes:

* Consistent formatting using Prettier.
* Linting with ESLint.
* Type safety using TypeScript.
* Passing automated tests.
* Production dependency license compliance.

---

# Releases

Publishing releases is performed by project maintainers.

Contributors do not need to perform any release-related tasks as part of a normal pull request.

---

# Best Practices

* Keep pull requests small and focused.
* Run the full validation suite before submitting changes.
* Update documentation whenever behaviour changes.
* Add tests for new functionality and bug fixes where applicable.
* Prefer improving existing implementations over introducing unnecessary complexity.

Thank you for helping improve VulneraScan.
