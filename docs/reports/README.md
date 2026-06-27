# Reports

Every successful scan generates a consistent set of reports designed for developers, CI/CD pipelines, security tooling, compliance workflows, and AI assistants.

Reports are always stored in the VulneraScan workspace. If you specify `--output`, copies are also written to the chosen directory.

```bash
vulnerascan scan --output ./security-reports
```

---

# Generated Reports

| Report                | File Name               | Purpose                                                       |
| --------------------- | ----------------------- | ------------------------------------------------------------- |
| Vulnerability Report  | `vulnerabilities.md`    | Human-readable summary of findings.                           |
| Vulnerability Data    | `vulnerabilities.json`  | Machine-readable vulnerability data.                          |
| CSV Report            | `vulnerabilities.csv`   | Tabular report for spreadsheets and data processing.          |
| SARIF                 | `vulnerabilities.sarif` | Integration with code scanning platforms and CI/CD pipelines. |
| CycloneDX SBOM        | `bom.json`              | Software Bill of Materials in CycloneDX format.               |
| SPDX SBOM             | `project.spdx.json`     | Software Bill of Materials in SPDX format.                    |
| AI Context (JSON)     | `llm-context.json`      | Structured security context for AI tools.                     |
| AI Context (Markdown) | `llm-context.md`        | Markdown version of the AI context.                           |

Every supported ecosystem produces the same reports.

---

# Human-Readable Reports

## Markdown

```text
vulnerabilities.md
```

The Markdown report provides an easy-to-read summary of:

- detected vulnerabilities
- affected packages
- severity information
- vulnerability references

This report is intended for developers and security reviews.

---

## CSV

```text
vulnerabilities.csv
```

The CSV report is useful for:

- spreadsheet analysis
- reporting
- importing into external systems

---

# Machine-Readable Reports

## JSON

```text
vulnerabilities.json
```

This is the canonical machine-readable representation of a scan.

It contains the complete vulnerability results and serves as the basis for other generated reports.

---

# Security Standards

## SARIF

```text
vulnerabilities.sarif
```

SARIF is intended for static analysis and security tooling.

Typical uses include:

- CI/CD pipelines
- GitHub Code Scanning
- Security dashboards
- Enterprise security platforms

---

## CycloneDX

```text
bom.json
```

The CycloneDX Software Bill of Materials describes the project's dependencies together with associated vulnerability information.

Typical uses include:

- software supply chain management
- compliance
- SBOM exchange
- security audits

---

## SPDX

```text
project.spdx.json
```

The SPDX Software Bill of Materials captures dependency and licensing information in a widely adopted industry format.

Typical uses include:

- license compliance
- SBOM exchange
- governance
- software inventory

---

# AI Context

VulneraScan generates two AI-oriented reports.

```text
llm-context.json
llm-context.md
```

These reports provide a structured representation of the project's dependency graph and vulnerability findings for consumption by AI assistants and automation workflows.

---

# Export Commands

After a project has been scanned, reports can be regenerated without performing another scan.

| Command                        | Generated Output                     |
| ------------------------------ | ------------------------------------ |
| `vulnerascan export sarif`     | `vulnerabilities.sarif`              |
| `vulnerascan export cyclonedx` | `bom.json`                           |
| `vulnerascan export spdx`      | `project.spdx.json`                  |
| `vulnerascan export llm`       | `llm-context.json`, `llm-context.md` |

Export commands operate on the most recent scan for the selected project.

---

# Output Directory

Using the `--output` option writes copies of the generated reports to the specified directory.

```bash
vulnerascan scan --output ./security-reports
```

If the directory does not exist, VulneraScan creates it automatically.

The workspace copy of every report is always retained for historical tracking and dashboard integration.

---

# Dashboard Integration

Every successful scan is automatically recorded in the local workspace.

The dashboard uses this scan history to display:

- registered projects
- scan history
- vulnerability summaries
- dependency statistics
- detailed scan results

Exporting or deleting copied reports from an `--output` directory does not affect the dashboard.

---

# Best Practices

- Archive generated reports as CI/CD build artifacts.
- Use SARIF with code scanning platforms.
- Use CycloneDX or SPDX when sharing SBOMs with customers or compliance tools.
- Use AI Context reports when supplying project security information to AI assistants.
- Keep historical scan results to track how vulnerabilities change over time.
