# Developer Setup & Guidelines

Welcome to VulneraScan development! This guide walks you through setting up the repository, running tests, checking licenses, and submitting contributions.

---

## Local Setup

### Prerequisites

- Node.js >= 18
- npm >= 8

### Clone & Install

```bash
git clone https://github.com/hnpsaga/vulnerascan.git
cd vulnerascan
npm install
```

### Running CLI Locally

```bash
npm run dev -- <command> [options]

# Examples:
npm run dev -- version
npm run dev -- doctor
npm run dev -- scan
```

---

## Validation Suite

Before submitting any Pull Request, ensure that every validation command succeeds with zero errors:

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

# Run license compliance check
npm run licenses:check

# Build the project
npm run build
```

---

## Pull Request Guidelines

### Branch Naming Conventions

Create descriptive feature branches using the prefix layout:

| Type          | Prefix Pattern           | Example                      |
| ------------- | ------------------------ | ---------------------------- |
| Feature       | `feat/<description>`     | `feat/scan-command`          |
| Bug Fix       | `fix/<description>`      | `fix/doctor-exit-code`       |
| Documentation | `docs/<description>`     | `docs/update-readme`         |
| Chore         | `chore/<description>`    | `chore/upgrade-dependencies` |
| Refactor      | `refactor/<description>` | `refactor/command-structure` |
| Release       | `release/<version>`      | `release/v0.0.2`             |

### Commit Conventions

We use the **Conventional Commits** specification. Commits should follow the layout:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

For example: `feat(cli): add doctor command checks`.
