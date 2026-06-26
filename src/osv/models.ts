/**
 * Raw OSV API request and response types.
 *
 * These are implementation details of the OSV provider.
 * Nothing outside `src/osv` should import from this file.
 */

export interface OsvPackageQuery {
  name: string;
  ecosystem: string;
}

export interface OsvVersionQuery {
  package: OsvPackageQuery;
  version: string;
}

export interface OsvBatchQueryRequest {
  queries: OsvVersionQuery[];
}

export interface OsvVulnRef {
  id: string;
}

export interface OsvQueryResult {
  vulns?: OsvVulnRef[];
}

export interface OsvBatchQueryResponse {
  results?: OsvQueryResult[];
}

export interface OsvReference {
  type: string;
  url: string;
}

export interface OsvSeverity {
  type: string;
  score: string;
}

export interface OsvAffectedRangeEvent {
  introduced?: string;
  fixed?: string;
  last_affected?: string;
}

export interface OsvAffectedRange {
  type: string;
  events: OsvAffectedRangeEvent[];
}

export interface OsvAffectedPackage {
  package?: OsvPackageQuery;
  versions?: string[];
  ranges?: OsvAffectedRange[];
}

export interface OsvVulnerability {
  id: string;
  modified: string;
  published?: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  references?: OsvReference[];
  severity?: OsvSeverity[];
  affected?: OsvAffectedPackage[];
}
