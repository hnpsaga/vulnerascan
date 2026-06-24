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

export interface VulnerabilityRecord {
  id: string;
  aliases: string[];
  summary: string;
  details?: string;
  references: VulnerabilityReference[];
  affectedPackages: PackageCoordinate[];
}

export interface ProviderResponse {
  provider: string;
  vulnerabilities: VulnerabilityRecord[];
  metadata?: Record<string, unknown>;
}
