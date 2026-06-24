export interface PackageCoordinate {
  ecosystem: string;
  packageName: string;
  version: string;
}

export interface VulnerabilityReference {
  source: string;
  identifier: string;
  url: string;
}

export interface VulnerabilitySeverity {
  type: string;
  score: string;
}

export interface VulnerabilityRecord {
  id: string;
  aliases: string[];
  summary: string;
  details?: string;
  references: VulnerabilityReference[];
  affectedPackages: PackageCoordinate[];
  severity?: VulnerabilitySeverity[];
}

export interface ProviderResponse {
  provider: string;
  vulnerabilities: VulnerabilityRecord[];
  metadata?: Record<string, unknown>;
}
