# Security Policy

Thank you for helping keep VulneraScan and its users secure.

If you believe you have discovered a security vulnerability in VulneraScan, please report it responsibly. This document describes the project's current security posture and vulnerability reporting policy.

---

# Supported Versions

VulneraScan is currently under active development.

At this time, only the latest released version is considered supported for security fixes.

Older releases may not receive security updates.

---

# Reporting a Vulnerability

A formal private vulnerability disclosure process has not yet been established.

If you discover a security vulnerability, please avoid publishing exploit details publicly until the issue has been reviewed and addressed by the project maintainer.

The preferred reporting mechanism will be documented here once it is available.

---

# What to Report

Please report vulnerabilities that could affect the security of VulneraScan or its users.

Examples include:

* Remote code execution
* Command injection
* Directory traversal
* Privilege escalation
* Arbitrary file access
* Denial of service caused by malformed input
* Dependency vulnerabilities that directly affect VulneraScan

If you are unsure whether an issue is security-related, please err on the side of reporting it.

---

# What Not to Report

The following are generally not considered security vulnerabilities:

* Feature requests
* Documentation issues
* Questions about product usage
* Cosmetic defects
* Issues affecting unsupported releases

---

# Security Characteristics

VulneraScan is designed with several security-focused architectural principles.

## Local Scanning

Projects are analyzed locally.

Source code, manifests, generated reports, and workspace data remain on the user's machine.

---

## Privacy First

Only dependency coordinates required to identify package versions are transmitted when querying the Open Source Vulnerability (OSV) database.

Project source code and repository contents are never uploaded.

---

## Standards-Based Outputs

VulneraScan generates standard security artifacts including:

* SARIF
* CycloneDX SBOM
* SPDX SBOM

These formats integrate with existing security and compliance tooling.

---

## Configurable OSV Endpoint

Organizations can configure VulneraScan to use an alternative OSV-compatible API endpoint through the `VULNERASCAN_OSV_API_URL` environment variable.

This enables integration with private mirrors or internally managed OSV-compatible services.

---

# Security Best Practices

To improve your software supply chain security:

* Keep project dependencies up to date.
* Scan projects regularly.
* Review reported vulnerabilities promptly.
* Regenerate SBOMs after dependency updates.
* Keep VulneraScan updated to the latest release.

---

# Future Updates

This policy will evolve as the project matures.

Future revisions are expected to document:

* Private vulnerability reporting
* Supported release policy
* Security advisory publication process
* Response and disclosure timelines
