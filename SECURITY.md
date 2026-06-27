# Security Policy

Thank you for helping keep VulneraScan and its users secure.

If you believe you have discovered a security vulnerability in VulneraScan, please report it responsibly.

---

# Supported Versions

VulneraScan is under active development.

Security fixes are provided for the latest released version. Older releases may not receive security updates.

---

# Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub Issues.

Instead, use **GitHub Private Vulnerability Reporting**, available from the repository's **Security** tab.

This allows vulnerabilities to be reported privately so they can be investigated and fixed before public disclosure.

When submitting a report, include as much information as possible, such as:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Proof of concept (if available)
- Suggested mitigation (optional)

After receiving a report, the project maintainer will investigate the issue, develop a fix if necessary, and coordinate responsible disclosure.

---

# What to Report

Examples of security issues include:

- Remote code execution
- Command injection
- Directory traversal
- Privilege escalation
- Arbitrary file access
- Denial of service caused by malformed input
- Dependency vulnerabilities that directly affect VulneraScan

If you are unsure whether an issue is security-related, please report it through the private reporting channel.

---

# What Not to Report

The following are generally not considered security vulnerabilities:

- Feature requests
- Documentation issues
- General usage questions
- Cosmetic defects
- Issues affecting unsupported releases

---

# Security Characteristics

VulneraScan is designed with several security-focused principles.

## Local Scanning

Projects are analyzed locally. Source code, manifests, generated reports, and workspace data remain on the user's machine.

## Privacy First

Only the dependency coordinates required to identify packages and versions are transmitted when querying the Open Source Vulnerability (OSV) database. Project source code and repository contents are never uploaded.

## Standards-Based Outputs

VulneraScan generates standard security artifacts including:

- SARIF
- CycloneDX SBOM
- SPDX SBOM

These formats integrate with existing security and compliance tooling.

## Configurable OSV Endpoint

Organizations can configure VulneraScan to use an alternative OSV-compatible API endpoint through the `VULNERASCAN_OSV_API_URL` environment variable.

---

# Security Best Practices

To improve your software supply chain security:

- Keep project dependencies up to date.
- Scan projects regularly.
- Review reported vulnerabilities promptly.
- Regenerate SBOMs after dependency updates.
- Keep VulneraScan updated to the latest release.
