# Exporters

VulneraScan supports exporting project dependency trees and vulnerability scan findings to standard compliance formats.

## CLI Options

Exporting is controlled via the `vulnerascan export` command or through options on `vulnerascan scan`.

```bash
vulnerascan export --format <format> --run <run_id> --output <dir>
```

---

## Supported Formats

### 1. CycloneDX (SBOM)

Generates a CycloneDX-compliant Software Bill of Materials (SBOM) in JSON format.

- Includes full dependency coordinate specifications (package, version, license details).
- Maps dependency hierarchy relationships.

### 2. SARIF

Generates a Static Analysis Results Interchange Format (SARIF) JSON report. SARIF is supported by GitHub Code Scanning and other modern security dashboards.

- Integrates seamlessly with CI pipelines.
- Maps findings to specific rules and affected dependency graph coordinates.

### 3. SPDX

Generates Software Package Data Exchange (SPDX) compliance documents in JSON format. Used widely for license clearance and security auditing.

### 4. LLM Summary

Produces a text summary formatted to be consumed by LLMs or AI assistants for vulnerability remediation.
