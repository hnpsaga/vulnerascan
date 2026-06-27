# ADR-003: Provider Layer for Vulnerability Databases

## Status

Proposed

## Date

2026-06-23

## Context

VulneraScan needs to query vulnerability databases to identify known CVEs, advisories, and security issues in detected dependencies. There are multiple vulnerability data sources available:

- **OSV (Open Source Vulnerabilities)** — free, open API, broad ecosystem coverage
- **NVD (National Vulnerability Database)** — authoritative CVSS scores, requires API key for high-rate usage
- **GitHub Security Advisories** — ecosystem-specific, excellent npm coverage, free

Each source has different API contracts, rate limits, data schemas, and coverage gaps. Coupling the scanner directly to a single provider creates lock-in and reduces resilience.

## Decision

We will implement a **Provider Layer** that abstracts over multiple vulnerability databases behind a common interface. The scanner will query providers via this abstraction rather than calling vendor APIs directly.

## Provider Interface

```typescript
interface Vulnerability {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  cvssScore?: number;
  summary: string;
  affectedVersionRange: string;
  referenceUrl: string;
}

interface VulnerabilityProvider {
  /** Human-readable name of the provider */
  name: string;

  /** Look up vulnerabilities for a specific package version */
  lookup(packageName: string, version: string): Promise<Vulnerability[]>;

  /** Check if this provider is available (e.g. API key configured) */
  isAvailable(): Promise<boolean>;
}
```

## Provider Priority

Providers will be queried in priority order. Results are merged and deduplicated by CVE/advisory ID:

1. **OSV** (primary — always available, no key required)
2. **GitHub Advisories** (secondary — always available for public advisories)
3. **NVD** (tertiary — requires API key for sustained usage)

## Configuration

Users can configure providers in `~/.vulnerascan/config.json`:

```json
{
  "providers": {
    "nvd": {
      "enabled": true,
      "apiKey": "your-nvd-api-key"
    }
  }
}
```

## Consequences

- OSV will be implemented first (v0.1.0) due to its free, unrestricted API.
- NVD and GitHub Advisories will be added in subsequent releases.
- Adding a new provider requires only implementing `VulnerabilityProvider`.
- Results from multiple providers are merged; duplicates are resolved by vulnerability ID.

## Alternatives Considered

| Alternative          | Rejected Because                                       |
| -------------------- | ------------------------------------------------------ |
| Direct OSV coupling  | Limits future extensibility, single point of failure   |
| Paid SaaS API only   | Introduces cost, external dependency, privacy concerns |
| Offline CVE database | High storage cost, sync complexity, staleness risk     |
