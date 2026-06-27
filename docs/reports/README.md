# Reports & Output Formats

VulneraScan organizes run results and produces human-readable and machine-processable outputs.

## Run Results Location

When a scan completes, all reports and models are archived locally in the workspace execution directories:
`~/.vulnerascan/workspaces/<workspace_id>/runs/<timestamp>/`

## Generated Scan Artifacts

Each scan run directory contains the following canonical files:

- **`run.json`**: Metadata summary of the execution run (duration, error codes, totals).
- **`discovery.json`**: Discovered project directory paths, manifest locations, and language ecosystems.
- **`dependency-graph.json`**: Structured, ecosystem-agnostic map of resolved dependencies, direct/transitive relationships, and package versions.
- **`vulnerabilities.json`**: Correlated scan findings matching advisory definitions to specific nodes inside the dependency graph.

## Exportable Reports

When using the `--output <dir>` option on `scan`, VulneraScan outputs user-facing summary reports:

- **Markdown Report (`vulnerabilities.md`)**: Visual summary table grouping vulnerability matches by severity, listing description links, and indicating direct/transitive introduction paths.
- **CSV Summary (`vulnerabilities.csv`)**: Raw flat list of findings for spreadsheet reviews.
- **JSON Export (`vulnerabilities.json`)**: Copy of the structured scan findings.
