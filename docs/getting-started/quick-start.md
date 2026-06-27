# Quick Start

This guide walks through your first vulnerability scan using VulneraScan.

By the end of this guide you will have:

* Verified your environment
* Scanned a project
* Reviewed the generated reports
* Opened the dashboard

If you haven't installed VulneraScan yet, complete the Installation guide first.

---

# 1. Verify Your Environment

Confirm that VulneraScan is installed correctly:

```bash
vulnerascan version
```

Then verify that your environment is ready:

```bash
vulnerascan doctor
```

The `doctor` command checks your operating system, configuration, and the ecosystem tooling available on your machine. Only the tools required for the ecosystems you intend to scan need to be installed.

---

# 2. Scan Your First Project

Navigate to the root directory of a supported project and run:

```bash
vulnerascan scan
```

By default, VulneraScan scans the current working directory.

To scan another directory:

```bash
vulnerascan scan --path /path/to/project
```

To also write copies of the generated reports into a directory of your choice:

```bash
vulnerascan scan --output ./security-reports
```

During the scan VulneraScan:

1. Detects the project ecosystem.
2. Resolves project dependencies.
3. Queries the Open Source Vulnerability (OSV) database.
4. Matches vulnerabilities against your dependency versions.
5. Generates reports.
6. Prints a summary in the terminal.

Your source project is never modified during dependency resolution. Any required lockfiles are generated inside VulneraScan's isolated workspace rather than your repository.

---

# 3. Review the Results

Every scan stores its complete results inside the local VulneraScan workspace.

If you supplied an output directory with `--output`, copies of the generated reports are also written there.

The available reports include:

* Markdown summary
* JSON report
* CSV report
* SARIF
* CycloneDX SBOM
* SPDX SBOM
* AI context (JSON)
* AI context (Markdown)

See the Reports and Exporters documentation for details about each format.

---

# 4. Open the Dashboard

Launch the local dashboard:

```bash
vulnerascan dashboard
```

The dashboard provides a browser-based view of:

* Registered projects
* Scan history
* Dependency statistics
* Vulnerability summaries
* Individual scan results

Every completed scan is automatically added to the dashboard's local workspace.

When running inside Docker, open your browser manually using the URL displayed by the CLI.

---

# 5. Typical Workflow

A typical development workflow looks like this:

```text
Install
    ↓
Verify (doctor)
    ↓
Run a scan
    ↓
Review reports
    ↓
Open dashboard
    ↓
Fix vulnerabilities
    ↓
Run another scan
```

Because VulneraScan stores scan history locally, subsequent scans build on the same workspace and become immediately available through the dashboard.

---

# Next Steps

After completing your first scan, you may want to explore:

* CLI Reference
* Supported Ecosystems
* Reports and Exporters
* Dashboard
* Architecture (for contributors)
