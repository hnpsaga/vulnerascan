# Command Line Interface

VulneraScan provides a command-line interface for scanning projects, managing scan history, exporting results, and viewing the local dashboard.

The executable installed by the npm package and Docker image is:

```text
vulnerascan
```

## Command Overview

| Command     | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| `scan`      | Scan a project for dependency vulnerabilities.                |
| `doctor`    | Verify the local environment and available ecosystem tooling. |
| `dashboard` | Launch the dashboard or view workspace summaries.             |
| `export`    | Export the latest scan in standard security formats.          |
| `version`   | Display the installed VulneraScan version.                    |

Display general help at any time:

```bash
vulnerascan --help
```

Display help for a specific command:

```bash
vulnerascan <command> --help
```

---

# scan

Scan the current project:

```bash
vulnerascan scan
```

Scan another directory:

```bash
vulnerascan scan --path /path/to/project
```

Store copies of generated reports in a directory:

```bash
vulnerascan scan --output ./reports
```

Assign a custom scan name:

```bash
vulnerascan scan --name "Release Candidate"
```

## Options

| Option                     | Description                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `-p, --path <path>`        | Project directory to scan. Defaults to the current working directory.                                            |
| `-o, --output <directory>` | Directory where copies of generated reports are written. Reports are always stored in the VulneraScan workspace. |
| `-n, --name <name>`        | Assign a custom name to the scan. Defaults to the scan timestamp.                                                |

## Scan Process

Running a scan performs the following steps:

1. Detect the project ecosystem.
2. Resolve project dependencies.
3. Query the Open Source Vulnerability (OSV) database.
4. Match vulnerabilities against resolved dependency versions.
5. Generate reports.
6. Store scan metadata in the local workspace.
7. Display a summary in the terminal.

Dependency resolution occurs inside VulneraScan's isolated workspace. Your project files are not modified.

---

# doctor

Verify that your environment is ready:

```bash
vulnerascan doctor
```

The command performs:

- Node.js runtime validation
- Supported operating system validation
- Workspace accessibility checks
- Detection of available ecosystem tooling

Supported tooling includes:

- npm
- pnpm
- yarn
- Maven
- Gradle
- Python
- Go
- Cargo
- Composer
- .NET

Missing ecosystem tooling is reported as diagnostic information and does not cause the command to fail unless a required core check fails.

---

# dashboard

Launch the local dashboard:

```bash
vulnerascan dashboard
```

By default the dashboard listens on:

```text
http://localhost:4000
```

## Options

| Option              | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `-p, --port <port>` | Dashboard server port. Default: `4000`.                                       |
| `-h, --host <host>` | Host interface to bind. Defaults to `localhost` or `VULNERASCAN_HOST` if set. |

### Workspace Summary

Display an aggregated workspace summary:

```bash
vulnerascan dashboard summary
```

Available filters:

- `--ecosystem`
- `--severity`
- `--start-date`
- `--end-date`

### Projects

List registered projects:

```bash
vulnerascan dashboard projects
```

Available filters:

- `--ecosystem`
- `--severity`

When running natively, VulneraScan attempts to open the dashboard automatically in your default browser.

When running inside Docker, browser auto-launch is disabled and the dashboard URL is printed to the terminal.

---

# export

Export the latest scan without running another scan.

## SARIF

```bash
vulnerascan export sarif
```

Produces:

```text
vulnerabilities.sarif
```

---

## CycloneDX

```bash
vulnerascan export cyclonedx
```

Produces:

```text
bom.json
```

---

## SPDX

```bash
vulnerascan export spdx
```

Produces:

```text
project.spdx.json
```

---

## AI Context

```bash
vulnerascan export llm
```

Produces:

- `llm-context.json`
- `llm-context.md`

### Shared Options

| Option                     | Description                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `-p, --path <path>`        | Project directory. Defaults to the current working directory.                          |
| `-o, --output <directory>` | Directory where exported files are written. Defaults to the current working directory. |

Exports operate on the most recent successful scan for the selected project.

---

# version

Display the installed version:

```bash
vulnerascan version
```

Example:

```text
VulneraScan v1.0.0
```

(The displayed version always reflects the installed package version.)

---

# Environment Variables

| Variable                  | Description                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `VULNERASCAN_HOME`        | Override the default workspace location used for projects, runs, cache, and reports.           |
| `VULNERASCAN_HOST`        | Override the default dashboard host binding.                                                   |
| `VULNERASCAN_OSV_API_URL` | Override the default OSV API endpoint (useful for proxies or self-hosted compatible services). |

`VULNERASCAN_TEST_MODE` is reserved for automated testing and is not part of the public CLI interface.

---

# Exit Codes

| Exit Code | Meaning                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| `0`       | Command completed successfully.                                                                                |
| `1`       | User-actionable condition such as vulnerabilities found, validation failure, invalid input, or export failure. |
| `2`       | Unexpected internal or operational failure.                                                                    |

This behavior allows VulneraScan to integrate cleanly into CI/CD pipelines, where vulnerability findings should fail the build while distinguishing unexpected runtime errors.

---

# Common Examples

Run a scan:

```bash
vulnerascan scan
```

Scan another directory:

```bash
vulnerascan scan --path ./services/api
```

Write reports to a directory:

```bash
vulnerascan scan --output ./security-reports
```

Verify the environment:

```bash
vulnerascan doctor
```

Launch the dashboard:

```bash
vulnerascan dashboard
```

Export a SARIF report:

```bash
vulnerascan export sarif --output ./security-reports
```

Display the installed version:

```bash
vulnerascan version
```
